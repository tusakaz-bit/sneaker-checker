import { cleanRakutenItemName } from './utils';
export async function searchRakutenItems(options: { keyword: string, brand?: string, sort?: string }) {
  const { keyword: rawKeyword, brand, sort = '+itemPrice' } = options;
  
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  let rawUrl = process.env.RAKUTEN_APP_URL || 'http://localhost:3000';
  const appUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  if (!appId || !accessKey) {
    throw new Error('環境変数が設定されていません。.env.localを確認してください。');
  }

  // 1文字の単語を除外（楽天API仕様）
  const keyword = rawKeyword
    .split(/[\s　]+/)
    .filter(word => word.length > 1)
    .join(' ');

  if (!keyword) {
    return []; // キーワード不足の場合は空配列を返す
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey: accessKey,
    keyword: keyword,
    availability: '1',
    sort: sort,
    hits: '30',
    imageFlag: '1',
    format: 'json',
    minPrice: '8000',
  });

  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Referer': appUrl,
      'Origin': appUrl,
    },
    // キャッシュを有効化（1時間）
    next: { revalidate: 3600 },
  });

  const data = await response.json();

  if (!response.ok || data.errors || data.error) {
    const errMsg = data.errors?.errorMessage || data.error_description || response.status;
    throw new Error(`楽天API Error: ${errMsg}`);
  }

  let items = data.Items ? data.Items.map((item: any) => { if(item.Item){ item.Item.originalName = item.Item.itemName || ''; item.Item.itemName = cleanRakutenItemName(item.Item.originalName); } return item.Item; }) : [];

  // ブランド厳密フィルタリング
  if (brand) {
    const b = brand.toLowerCase();
    items = items.filter((item: any) => {
      const title = (item.itemName || '').toLowerCase();
      const catchcopy = (item.catchcopy || '').toLowerCase();
      
      if (b === 'on') {
        return title.includes('オン') || title.includes('on running') || catchcopy.includes('オン') || catchcopy.includes('on running');
      } else if (b === 'nike') {
        return title.includes('nike') || title.includes('ナイキ') || catchcopy.includes('ナイキ');
      } else if (b === 'adidas') {
        return title.includes('adidas') || title.includes('アディダス') || catchcopy.includes('アディダス');
      } else if (b === 'salomon') {
        return title.includes('salomon') || title.includes('サロモン') || catchcopy.includes('サロモン');
      } else if (b === 'new balance') {
        return title.includes('new balance') || title.includes('ニューバランス') || catchcopy.includes('ニューバランス');
      } else if (b === 'hoka') {
        return title.includes('hoka') || title.includes('ホカ') || catchcopy.includes('ホカ');
} else if (b === 'asics') {
        return title.includes('asics') || title.includes('アシックス') || catchcopy.includes('アシックス');
      } else if (b === 'onitsuka tiger') {
        return title.includes('onitsuka') || title.includes('オニツカ') || catchcopy.includes('オニツカ');
      }
      
      return title.includes(b) || catchcopy.includes(b);
    });
  }

  return items;
}

export async function getTimelineItems() {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  
  let rawUrl = process.env.RAKUTEN_APP_URL || 'http://localhost:3000';
  const appUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  if (!appId || !accessKey) {
    throw new Error('環境変数が設定されていません。.env.localを確認してください。');
  }

  const watchwords = ['Nike Dunk', 'On Cloud', 'Salomon'];

  try {
    const fetchPromises = watchwords.map(async (keyword) => {
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
        minPrice: '8000',
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
      
      return data.Items ? data.Items.map((item: any) => {
        if(item.Item){ 
          item.Item.originalName = item.Item.itemName || ''; 
          item.Item.itemName = cleanRakutenItemName(item.Item.originalName); 
        }
        return { ...item.Item, searchKeyword: keyword };
      }) : [];
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

    return timelineItems;
  } catch (error) {
    console.error('楽天API通信エラー(Timeline):', error);
    return [];
  }
}


