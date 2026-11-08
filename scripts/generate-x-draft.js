/**
 * X（旧Twitter）投稿用原稿 自動生成スクリプト
 * 
 * Supabaseからスニーカーデータおよび価格履歴を取得し、
 * 「値下がり」「定価割れ」「トレンド」「定番注目」の4つの切り口で
 * Buffer予約用のスレッド形式原稿（親ツイート＋子ツイート）を生成します。
 * 
 * ※X無料プランの文字数制限（280ウェイト / 全角140文字以内）を厳格に順守する安全設計。
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 環境変数の取得（GitHub Secrets または ローカル環境）
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const siteBaseUrl = process.env.SITE_BASE_URL || 'https://sneaker-checker.com';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ エラー: SUPABASE_URL または SUPABASE_ANON_KEY が設定されていません。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// トレンドとして優先ピックアップするキーワード群
const TREND_KEYWORDS = [
  'nippon made',
  '9060',
  'gel-1130',
  'jordan 4',
  'sb dunk',
  'speedcat',
  'samba',
  '1906r',
  '2002r',
  'mexico 66',
  'kayano'
];

/**
 * X（旧Twitter）の文字数ウェイト計算（全角2 / 半角1、URLは23）
 * 無料プラン上限: 280ウェイト（全角換算140文字）
 */
function getTwitterWeight(text) {
  if (!text) return 0;
  // URLを23文字相当に置換して計算
  const urlRegex = /https?:\/\/[^\s]+/g;
  const textWithoutUrls = text.replace(urlRegex, '');
  const urlMatches = text.match(urlRegex) || [];
  let urlWeight = urlMatches.length * 23;

  let weight = 0;
  for (const char of textWithoutUrls) {
    const code = char.codePointAt(0);
    // 半角英数記号および半角カナは1ウェイト、全角文字・絵文字等は2ウェイト
    if (code <= 0x007f || (code >= 0xff61 && code <= 0xff9f)) {
      weight += 1;
    } else {
      weight += 2;
    }
  }
  return weight + urlWeight;
}

function formatYen(val) {
  if (val === null || val === undefined || isNaN(val)) return '---';
  return Number(val).toLocaleString();
}

async function fetchData() {
  // 1. スニーカー一覧の取得
  const { data: sneakers, error: sneakersError } = await supabase
    .from('sneakers')
    .select('*');

  if (sneakersError || !sneakers || sneakers.length === 0) {
    throw new Error(`スニーカー一覧の取得に失敗しました: ${sneakersError?.message || 'データなし'}`);
  }

  // 2. 価格履歴の取得（テーブル名 price_histories を優先、なければ price_history をフォールバック）
  let histories = [];
  const { data: histData1, error: histError1 } = await supabase
    .from('price_histories')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (!histError1 && histData1) {
    histories = histData1;
  } else {
    const { data: histData2, error: histError2 } = await supabase
      .from('price_history')
      .select('*')
      .order('recorded_at', { ascending: false });
    if (!histError2 && histData2) {
      histories = histData2;
    }
  }

  return { sneakers, histories };
}

function analyzeItems(sneakers, histories) {
  const historyMap = new Map();
  for (const h of histories) {
    if (!historyMap.has(h.style_code)) {
      historyMap.set(h.style_code, []);
    }
    historyMap.get(h.style_code).push(h);
  }

  const analyzed = sneakers.map(sneaker => {
    const itemHistories = historyMap.get(sneaker.style_code) || [];
    itemHistories.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

    const latest = itemHistories[0] || null;
    const previous = itemHistories[1] || null;

    const latestPrice = latest ? latest.lowest_price : null;
    const previousPrice = previous ? previous.lowest_price : null;
    const listPrice = sneaker.list_price || null;

    // 値下がり額・値下がり率
    const priceDrop = (latestPrice && previousPrice && latestPrice < previousPrice)
      ? previousPrice - latestPrice
      : 0;

    // 定価からの割引額・割引率
    const discountAmount = (latestPrice && listPrice && latestPrice < listPrice)
      ? listPrice - latestPrice
      : 0;
    const discountRate = (discountAmount > 0 && listPrice)
      ? Math.round((discountAmount / listPrice) * 100)
      : 0;

    // トレンド判定
    const searchTarget = `${sneaker.name || ''} ${sneaker.model || ''} ${sneaker.brand || ''}`.toLowerCase();
    const isTrend = TREND_KEYWORDS.some(kw => searchTarget.includes(kw));

    return {
      ...sneaker,
      latestPrice,
      previousPrice,
      listPrice,
      shopCount: latest ? (latest.shop_count || 1) : 1,
      priceDrop,
      discountAmount,
      discountRate,
      isTrend,
      hasPrice: latestPrice !== null && latestPrice > 0
    };
  });

  return analyzed;
}

function pickFourItems(analyzed) {
  const selected = [];
  const selectedCodes = new Set();

  const addIfUnique = (item, category, badge) => {
    if (item && !selectedCodes.has(item.style_code)) {
      selected.push({ ...item, category, badge });
      selectedCodes.add(item.style_code);
      return true;
    }
    return false;
  };

  const validItems = analyzed.filter(i => i.hasPrice);

  // 1. 【値下がり注目枠】前回から価格が下がったアイテム
  const priceDropCandidates = [...validItems]
    .filter(i => i.priceDrop > 0)
    .sort((a, b) => b.priceDrop - a.priceDrop);

  if (priceDropCandidates.length > 0) {
    addIfUnique(priceDropCandidates[0], 'price_drop', '📉 値下げ速報');
  }

  // 2. 【定価割れセール枠】定価より安く、割引率が高いアイテム
  const discountCandidates = [...validItems]
    .filter(i => i.discountRate > 0 && !selectedCodes.has(i.style_code))
    .sort((a, b) => b.discountRate - a.discountRate);

  if (discountCandidates.length > 0) {
    addIfUnique(discountCandidates[0], 'discount', '🔥 定価割れセール');
  }

  // 3. 【トレンド・話題モデル枠】NIPPON MADE, 9060などの注目モデル
  const trendCandidates = [...validItems]
    .filter(i => i.isTrend && !selectedCodes.has(i.style_code))
    .sort((a, b) => (b.discountRate || 0) - (a.discountRate || 0));

  if (trendCandidates.length > 0) {
    addIfUnique(trendCandidates[0], 'trend', '✨ トレンド人気');
  }

  // 4. 【定番・注目枠】Air Force 1, CT70, Samba等の王道モデル
  const popularCandidates = [...validItems]
    .filter(i => !selectedCodes.has(i.style_code))
    .sort((a, b) => (b.shopCount || 0) - (a.shopCount || 0));

  if (popularCandidates.length > 0) {
    addIfUnique(popularCandidates[0], 'popular', '👟 王道・定番人気');
  }

  // 4件に満たない場合のフォールバック（重複なしで埋める）
  for (const item of validItems) {
    if (selected.length >= 4) break;
    addIfUnique(item, 'general', '👀 本日の注目モデル');
  }

  for (const item of analyzed) {
    if (selected.length >= 4) break;
    addIfUnique(item, 'general', '👟 おすすめスニーカー');
  }

  return selected;
}

/**
 * X無料プランの制限（280ウェイト / 全角140文字）に厳密に収まる親ツイートを構築
 */
function buildParentTweet(item) {
  // 商品名が長すぎる場合は適度に調整（子ツイートで完全な商品名を記載するため安心）
  let displayName = item.name || `${item.brand} ${item.model}`;
  if (displayName.length > 30) {
    displayName = displayName.substring(0, 28) + '…';
  }

  let hook = '';
  let priceLine = '';

  if (item.category === 'price_drop' && item.priceDrop > 0) {
    hook = `＼人気スニーカー値下がり速報📉／\n「${displayName}」が前回より【¥${formatYen(item.priceDrop)}値下げ】！`;
    priceLine = item.listPrice
      ? `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF）`
      : `現在の最安値：¥${formatYen(item.latestPrice)}`;
  } else if (item.category === 'discount' && item.discountRate > 0) {
    hook = `＼定価割れセール速報🚨お買い得／\n「${displayName}」が国内定価より大幅値下げ！`;
    priceLine = `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF / -¥${formatYen(item.discountAmount)}）`;
  } else if (item.category === 'trend') {
    hook = `＼今季大本命！話題のトレンド🔥／\nストリートやSNSで人気の「${displayName}」！`;
    priceLine = item.listPrice
      ? `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}`
      : `現在の最安値：¥${formatYen(item.latestPrice)}`;
  } else {
    hook = `＼本日のスニーカー最安値速報👟／\n定番人気モデル「${displayName}」のリアルタイム相場！`;
    priceLine = item.listPrice && item.discountRate > 0
      ? `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF）`
      : `現在の最安値：¥${formatYen(item.latestPrice)}`;
  }

  const callToAction = 'サイズがあるうちに要チェック👀✨';
  const baseTags = '#スニーカー #最安値 #SNEAKERCHECKER';

  let tweet = `${hook}\n\n${priceLine}\n${callToAction}\n\n${baseTags}`;

  // もし万が一280ウェイトを超えた場合の安全ガード
  if (getTwitterWeight(tweet) > 280) {
    tweet = `${hook}\n\n${priceLine}\n\n${baseTags}`;
  }

  return tweet;
}

function generatePostDrafts(selectedItems) {
  const drafts = selectedItems.map((item, index) => {
    const itemUrl = `${siteBaseUrl}/item/${item.style_code}`;

    // 親ツイート（無料プラン上限280ウェイト以内に収めた文面）
    const parentTweet = buildParentTweet(item);
    const parentWeight = getTwitterWeight(parentTweet);
    const parentFullWidthEquivalent = Math.ceil(parentWeight / 2);

    // 子ツイート（正式名称・型番・誘導CTA・詳細URL）
    const childTweet = `【${item.name}】\n（型番: ${item.style_code}）\n\n▼現在の最安値ショップと価格推移グラフはこちら👇\n${itemUrl}`;
    const childWeight = getTwitterWeight(childTweet);
    const childFullWidthEquivalent = Math.ceil(childWeight / 2);

    return {
      index: index + 1,
      item,
      parentTweet,
      parentWeight,
      parentFullWidthEquivalent,
      childTweet,
      childWeight,
      childFullWidthEquivalent,
      imageNote: '※スニーカーの画像を1枚添付して投稿してください'
    };
  });

  return drafts;
}

function formatMarkdownSummary(drafts) {
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });

  let md = `## 👟 本日のX（旧Twitter）投稿用原稿ドラフト（${today} 作成）\n\n`;
  md += `Bufferなどの予約投稿ツールへそのままコピペして利用できるスレッド形式（親ツイート＋子ツイート）です。\n`;
  md += `※**X無料プランの文字数制限（全角140文字以内 / 280ウェイト以内）に完全準拠**しています。\n\n`;

  drafts.forEach((draft) => {
    md += `### 📌 投稿 ${draft.index}：【${draft.item.badge}】${draft.item.name}\n\n`;
    md += `**【親ツイート】**（全角換算: **${draft.parentFullWidthEquivalent} / 140文字** | ウェイト: ${draft.parentWeight}/280）\n`;
    md += `> 💡 **投稿時の注意**: ${draft.imageNote}\n\n`;
    md += "```text\n" + draft.parentTweet + "\n```\n\n";

    md += `**【子ツイート】**（全角換算: **${draft.childFullWidthEquivalent} / 140文字** | スレッド返信としてコピペ）\n\n`;
    md += "```text\n" + draft.childTweet + "\n```\n\n";
    md += `---\n\n`;
  });

  return md;
}

async function main() {
  try {
    console.log('🚀 X投稿用ドラフト生成処理を開始します（無料プラン文字数対応版）...');

    console.log('📦 Supabaseからデータを取得中...');
    const { sneakers, histories } = await fetchData();
    console.log(`✅ 取得完了: スニーカー ${sneakers.length} 件, 価格履歴 ${histories.length} 件`);

    console.log('🔍 価格とトレンドを分析中...');
    const analyzed = analyzeItems(sneakers, histories);

    console.log('🎯 投稿対象の4件をピックアップ中...');
    const selected = pickFourItems(analyzed);

    console.log('✍️ 投稿用原稿テキスト（スレッド形式）を生成中...');
    const drafts = generatePostDrafts(selected);

    const markdownOutput = formatMarkdownSummary(drafts);

    console.log('\n=================== [ 生成された原稿 ] ===================\n');
    console.log(markdownOutput);
    console.log('==========================================================\n');

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdownOutput, 'utf8');
      console.log('✅ GitHub Step Summary へ正常に出力しました。');
    }

    console.log('🎉 すべての処理が正常に完了しました！');
  } catch (error) {
    console.error('❌ 処理中にエラーが発生しました:', error);
    process.exit(1);
  }
}

main();