import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  // 認証: クエリパラメータまたはヘッダーのシークレットキーで保護 (不正な実行を防ぐ)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. DBから対象となるスニーカーの型番（style_code）一覧を取得
    const { data: sneakers, error: fetchError } = await supabase
      .from('sneakers')
      .select('style_code, name, brand');

    if (fetchError || !sneakers) {
      throw new Error(`Failed to fetch sneakers: ${fetchError?.message}`);
    }

    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    
    if (!appId || !accessKey) {
      throw new Error('Rakuten API keys are missing');
    }

    const updatedItems = [];

    // 2. 各型番について楽天APIを叩き、最安値を記録
    for (const sneaker of sneakers) {
      const styleCode = sneaker.style_code;
      
      // レートリミット対策: 500msスリープ
      await delay(500);

      const params = new URLSearchParams({
        applicationId: appId,
        accessKey: accessKey,
        keyword: styleCode,
        availability: '1',
        sort: '+itemPrice', // 安い順
        hits: '30',
        imageFlag: '1',
        format: 'json',
      });

      const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;

      
      const appUrl = process.env.RAKUTEN_APP_URL?.startsWith('http') ? process.env.RAKUTEN_APP_URL : `https://${process.env.RAKUTEN_APP_URL || 'localhost:3000'}`;

      const res = await fetch(url, {
        headers: {
          'Referer': appUrl,
          'Origin': appUrl,
        }
      });

      const data = await res.json();

      if (!res.ok || data.errors) {
        console.error(`Rakuten API Error for ${styleCode}:`, data.errors);
        continue;
      }

      const items = data.Items || [];
      
      // 3. ノイズ除去 (安価な靴ひも・アクセサリー等を除外するフィルタリング)
      const validItems = items.filter((itemObj: any) => {
        const item = itemObj.Item;
        const price = item.itemPrice;
        const title = item.itemName.toLowerCase();

        // ノイズ除去条件: 価格が3000円未満のものはスニーカー本体ではない可能性が高い
        if (price < 3000) return false;
        
        // ノイズ除去条件: タイトルにアクセサリー系のキーワードが含まれる場合は除外
        const excludeKeywords = ['紐', 'ひも', 'シューレース', 'キーホルダー', 'ソックス', '靴下', 'インソール', '中敷き', 'tシャツ', 'パーカー', 'キャップ'];
        for (const kw of excludeKeywords) {
          if (title.includes(kw)) return false;
        }

        return true;
      });

      if (validItems.length === 0) continue;

      // ソートされているので最初のアイテムが最安値
      const lowestPrice = validItems[0].Item.itemPrice;
      
      // 最高値を取得（便宜上、30件中の最高値を採用）
      let highestPrice = lowestPrice;
      for (const itemObj of validItems) {
        if (itemObj.Item.itemPrice > highestPrice) {
          highestPrice = itemObj.Item.itemPrice;
        }
      }

      const shopCount = validItems.length; // 検索ヒットした有効店舗数
      const recordedAt = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // 4. price_histories テーブルに保存 (同日はON CONFLICTでUPDATEする、または無視)
      // Supabaseのupsertを使用
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
      } else {
        updatedItems.push(styleCode);
        
        // 5. オンデマンドキャッシュ更新
        // DB更新があった商品の詳細ページのキャッシュをパージする
        revalidatePath(`/item/${styleCode}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${updatedItems.length} items.`,
      updated: updatedItems
    });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
