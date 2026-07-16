// 楽天APIのベースURL
const RAKUTEN_API_BASE_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';

export async function searchSneakers(keyword: string, sort: string = '+itemPrice') {
  // 環境変数からアプリIDを取得
  const appId = process.env.NEXT_PUBLIC_RAKUTEN_APP_ID;
  
  if (!appId) {
    throw new Error('楽天APIのアプリケーションIDが設定されていません。');
  }

  // クエリパラメータの構築
  const params = new URLSearchParams({
    applicationId: appId,
    keyword: keyword,
    availability: '1', // 在庫あり
    sort: sort, // +itemPrice (安い順), -updateTimestamp (更新順/新着順)
    hits: '30', // 取得件数
    imageFlag: '1', // 画像あり
  });

  const url = `${RAKUTEN_API_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }, // 60秒キャッシュ（負荷軽減のため）
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.Items.map((item: any) => item.Item);
  } catch (error) {
    console.error('楽天APIの取得に失敗しました:', error);
    throw error;
  }
}
