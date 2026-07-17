import { cleanRakutenItemName } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  
  let rawUrl = process.env.RAKUTEN_APP_URL || 'http://localhost:3000';
  const appUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  if (!appId || !accessKey) {
    return NextResponse.json(
      { error: '環境変数が設定されていません。.env.localを確認してください。' },
      { status: 500 }
    );
  }

  const watchwords = ['Nike Dunk', 'On Cloud', 'Salomon'];

  try {
    const fetchPromises = watchwords.map(async (keyword) => {
      // タイムラインもノイズ除去フィルターを適用
      const finalKeyword = `${keyword} スニーカー`;
      
      const params = new URLSearchParams({
        applicationId: appId,
        accessKey: accessKey,
        keyword: finalKeyword,
        availability: '1',
        sort: '-updateTimestamp',
        hits: '10',
        imageFlag: '1',
        format: 'json',
        minPrice: '8000', // 安すぎる小物を除外
      });

      const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Referer': appUrl,
          'Origin': appUrl,
        },
        next: { revalidate: 60 },
      });

      const data = await response.json();
      if (!response.ok || data.errors || data.error) {
        throw new Error(`API Error for ${keyword}: ` + JSON.stringify(data));
      }
      
      return data.Items ? data.Items.map((item: any) => ({ ...item.Item, searchKeyword: keyword })) : [];
    });

    const results = await Promise.all(fetchPromises);

    const timelineItems = [];
    const maxLength = Math.max(...results.map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (let j = 0; j < results.length; j++) {
        if (results[j][i]) {
          timelineItems.push(results[j][i]);
        }
      }
    }

    return NextResponse.json({ items: timelineItems });
  } catch (error: any) {
    console.error('楽天API通信エラー(Timeline):', error);
    return NextResponse.json({ error: `通信エラー: ${error.message}` }, { status: 500 });
  }
}