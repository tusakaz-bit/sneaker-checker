import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { uploadImageToSupabase } from '@/lib/storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // クエリパラメータから取得リミットを設定（デフォルト10件）
  const limitParam = searchParams.get('limit');
  const syncLimit = limitParam ? parseInt(limitParam, 10) : 10;

  try {
    const { data: sneakers, error: fetchError } = await supabase
      .from('sneakers')
      .select('style_code, name, brand, image_url');

    if (fetchError || !sneakers) {
      throw new Error(`Failed to fetch sneakers: ${fetchError?.message}`);
    }

    // 今日の日付文字列を取得
    const todayStr = new Date().toISOString().split('T')[0];

    // price_historiesから本日のデータを取得し、すでに同期済みのstyle_codeを特定
    const { data: todayHistories, error: histError } = await supabase
      .from('price_histories')
      .select('style_code')
      .eq('recorded_at', todayStr);

    if (histError) {
      console.warn("Could not fetch today's histories. Proceeding without filters.", histError.message);
    }

    const syncedCodes = new Set((todayHistories || []).map(h => h.style_code));

    // 本日未同期のスニーカーを優先的に選定
    const unsyncedSneakers = sneakers.filter(s => !syncedCodes.has(s.style_code));
    
    // 未同期が足りない場合は、すでに同期済みのものも補填してバッチ数（syncLimit）にする
    let targetSneakers = unsyncedSneakers.slice(0, syncLimit);
    if (targetSneakers.length < syncLimit) {
      const needed = syncLimit - targetSneakers.length;
      const fillSneakers = sneakers.filter(s => syncedCodes.has(s.style_code)).slice(0, needed);
      targetSneakers = [...targetSneakers, ...fillSneakers];
    }

    console.log(`Total target sneakers for this batch: ${targetSneakers.length} (Unsynced: ${unsyncedSneakers.length}, Synced: ${syncedCodes.size})`);

    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    
    if (!appId || !accessKey) {
      throw new Error('Rakuten API keys are missing');
    }

    const updatedItems = [];
    const skippedItems = [];

    for (const sneaker of targetSneakers) {
      const styleCode = sneaker.style_code;
      await delay(1500); // 瞬間レート制限（429）を回避するため1500msに延長

      const params = new URLSearchParams({
        applicationId: appId,
        accessKey: accessKey,
        keyword: styleCode,
        availability: '1',
        sort: '+itemPrice',
        hits: '30',
        imageFlag: '1',
        format: 'json',
      });

      const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;
      
      // ダブルクォーテーションのクリーンアップ
      const rawUrlConfig = (process.env.RAKUTEN_APP_URL || 'localhost:3000').replace(/^"|"$/g, '');
      const appUrl = rawUrlConfig.startsWith('http')
        ? rawUrlConfig
        : `https://${rawUrlConfig}`;

      try {
        const res = await fetch(url, {
          headers: { 'Referer': appUrl, 'Origin': appUrl }
        });

        const data = await res.json();

        if (!res.ok || data.errors) {
          console.error(`Rakuten API Error for ${styleCode}:`, data.errors || data);
          skippedItems.push({ styleCode, reason: 'API_ERROR', details: data.errors || data });
          continue;
        }

        const items = data.Items || [];
        
        const validItems = items.filter((itemObj: any) => {
          const item = itemObj.Item;
          const price = item.itemPrice;
          const title = item.itemName.toLowerCase();

          if (price < 3000) return false;
          
          const excludeKeywords = ['shoelace', 'keychain', 'socks', 'insole', 't-shirt', 'hoodie', 'cap'];
          for (const kw of excludeKeywords) {
            if (title.includes(kw)) return false;
          }
          return true;
        });

        if (validItems.length === 0) {
          skippedItems.push({ styleCode, reason: 'NO_VALID_ITEMS' });
          continue;
        }

        const lowestPrice = validItems[0].Item.itemPrice;
        let highestPrice = lowestPrice;
        for (const itemObj of validItems) {
          if (itemObj.Item.itemPrice > highestPrice) {
            highestPrice = itemObj.Item.itemPrice;
          }
        }

        const shopCount = validItems.length;
        const recordedAt = todayStr;

        const currentImageUrl = sneaker.image_url || '';
        const isAlreadyInStorage = currentImageUrl.includes('supabase.co/storage');

        if (!isAlreadyInStorage && validItems[0].Item.mediumImageUrls?.length > 0) {
          const sourceUrl = validItems[0].Item.mediumImageUrls[0].imageUrl;
          try {
            const publicUrl = await uploadImageToSupabase(sourceUrl, styleCode);
            if (publicUrl) {
              await supabase
                .from('sneakers')
                .update({ image_url: publicUrl })
                .eq('style_code', styleCode);
            }
          } catch (e) {
            console.error(`Failed to upload image for ${styleCode}:`, e);
          }
        }

        const { error: upsertError } = await supabase
          .from('price_histories')
          .upsert({
            style_code: styleCode,
            lowest_price: lowestPrice,
            highest_price: highestPrice,
            shop_count: shopCount,
            recorded_at: recordedAt
          }, { onConflict: 'style_code,recorded_at' });

        if (upsertError) {
          console.error(`DB Upsert Error for ${styleCode}:`, upsertError);
          skippedItems.push({ styleCode, reason: 'DB_UPSERT_ERROR', details: upsertError });
        } else {
          updatedItems.push(styleCode);
          revalidatePath(`/item/${styleCode}`);
        }
      } catch (err: any) {
        console.error(`Failed to process ${styleCode}:`, err);
        skippedItems.push({ styleCode, reason: 'EXCEPTION', details: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      batch_limit: syncLimit,
      unsynced_remaining: unsyncedSneakers.length - targetSneakers.filter(s => !syncedCodes.has(s.style_code)).length,
      processed_count: targetSneakers.length,
      updated_count: updatedItems.length,
      updated: updatedItems,
      skipped: skippedItems
    });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}