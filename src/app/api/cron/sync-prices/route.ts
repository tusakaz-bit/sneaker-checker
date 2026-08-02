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

  try {
    const { data: sneakers, error: fetchError } = await supabase
      .from('sneakers')
      .select('style_code, name, brand, image_url');

    if (fetchError || !sneakers) {
      throw new Error(`Failed to fetch sneakers: ${fetchError?.message}`);
    }

    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    
    if (!appId || !accessKey) {
      throw new Error('Rakuten API keys are missing');
    }

    const updatedItems = [];

    for (const sneaker of sneakers) {
      const styleCode = sneaker.style_code;
      await delay(500);

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
      const appUrl = process.env.RAKUTEN_APP_URL?.startsWith('http')
        ? process.env.RAKUTEN_APP_URL
        : `https://${process.env.RAKUTEN_APP_URL || 'localhost:3000'}`;

      const res = await fetch(url, {
        headers: { 'Referer': appUrl, 'Origin': appUrl }
      });

      const data = await res.json();

      if (!res.ok || data.errors) {
        console.error(`Rakuten API Error for ${styleCode}:`, data.errors);
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

      if (validItems.length === 0) continue;

      const lowestPrice = validItems[0].Item.itemPrice;
      let highestPrice = lowestPrice;
      for (const itemObj of validItems) {
        if (itemObj.Item.itemPrice > highestPrice) {
          highestPrice = itemObj.Item.itemPrice;
        }
      }

      const shopCount = validItems.length;
      const recordedAt = new Date().toISOString().split('T')[0];

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
      } else {
        updatedItems.push(styleCode);
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