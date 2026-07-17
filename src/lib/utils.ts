// URL用の文字列に変換 (例: "Air Force 1" -> "air-force-1")
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // スペースをハイフンに置換
    .replace(/[^\w\-]+/g, '')   // 英数字とハイフン以外を削除
    .replace(/\-\-+/g, '-');    // 連続するハイフンを1つに
}

// スラッグを元に戻す簡易関数 (ハイフンをスペースに)
// ※厳密な復元は辞書と突き合わせる必要があるため、検索用の一時処理として利用
export function deslugify(slug: string): string { if (!slug) return "";
  return slug.replace(/-/g, ' ');
}
// 楽天の「0と5のつく日」かどうかを判定する
export function getRakutenDayInfo(): { isToday: boolean, isTomorrow: boolean } {
  // 日本時間で取得するためにDateをJSTに変換する簡易ロジック
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  // utc時間を取得
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstDate = new Date(utc + jstOffset);

  const today = jstDate.getDate();
  
  // 明日の日付を取得
  const tomorrowDate = new Date(jstDate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = tomorrowDate.getDate();

  const is0or5 = (day: number) => day % 5 === 0;

  return {
    isToday: is0or5(today),
    isTomorrow: is0or5(tomorrow)
  };
}

// タイムライン用のランダムな閲覧人数を生成する (1〜15人)
export function getRandomViewerCount(seed: string): number {
  // 文字列から簡易的なハッシュを生成し、シード値にする
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  // 1〜15の乱数風
  return Math.abs(hash % 15) + 1;
}
// 楽天のスパムっぽい商品名を綺麗にする関数
export function cleanRakutenItemName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName;
  cleaned = cleaned.replace(/【[^】]*】/g, ' ');
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
  cleaned = cleaned.replace(/＼[^／]*／/g, ' ');
  cleaned = cleaned.replace(/★[^★]*★/g, ' ');
  cleaned = cleaned.replace(/※[^※]*※/g, ' ');
  cleaned = cleaned.replace(/(送料無料|あす楽|正規品|新品|国内|海外|限定|メンズ|レディース|ユニセックス|スニーカー|シューズ)/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || rawName;
}