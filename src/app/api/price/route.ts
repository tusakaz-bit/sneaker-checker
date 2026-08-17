import { NextResponse } from 'next/server';
import { searchSneakers } from '@/lib/rakutenApi';
import { getRakutenSearchQuery } from '@/lib/searchQuery';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleCode = searchParams.get('styleCode');
  const brand = searchParams.get('brand') || '';
  const model = searchParams.get('model') || '';

  if (!styleCode) {
    return NextResponse.json({ error: 'styleCode is required' }, { status: 400 });
  }

  try {
    // 1. まずデータベース（price_histories）に最新の最安値があるか確認
    const { data: history } = await supabase
      .from('price_histories')
      .select('lowest_price')
      .eq('style_code', styleCode)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (history && history.lowest_price > 0) {
      return NextResponse.json({ lowestPrice: history.lowest_price });
    }

    // 2. データベースにない場合のみ楽天APIからリアルタイム取得
    const sneaker = { style_code: styleCode, brand, model };
    const keyword = getRakutenSearchQuery(sneaker);
    
    // searchSneakers内部で genreId: '558885' は付与されている
    const items = await searchSneakers(keyword);
    
    // itemsの中から最安値を特定（簡易的なノイズ除去）
    const validItems = items.filter((itemObj: any) => {
      const price = itemObj.itemPrice;
      const title = itemObj.itemName.toLowerCase();

      if (price < 3000) return false;
      const excludeKeywords = ['shoelace', 'keychain', 'socks', 'insole', 't-shirt', 'hoodie', 'cap', 'シューレース', '靴紐', 'インソール', '雑誌', 'ステッカー', 'シューケア'];
      for (const kw of excludeKeywords) {
        if (title.includes(kw)) return false;
      }
      return true;
    });

    if (validItems.length === 0) {
      return NextResponse.json({ lowestPrice: null });
    }

    // sort=+itemPrice で取得しているため最初の要素が最安値
    const lowestPrice = validItems[0].itemPrice;

    return NextResponse.json({ lowestPrice });
  } catch (error) {
    console.error('Failed to fetch real-time price:', error);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
