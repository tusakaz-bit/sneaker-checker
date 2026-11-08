/**
 * X（旧Twitter）投稿用原稿 自動生成スクリプト
 * 
 * Supabaseからスニーカーデータおよび価格履歴を取得し、
 * 「値下がり」「定価割れ」「トレンド」「定番注目」の4つの切り口で
 * Buffer予約用のスレッド形式原稿（親ツイート＋子ツイート）を生成します。
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
    addIfUnique(priceDropCandidates[0], 'price_drop', '📉 直近で値下げ！');
  }

  // 2. 【定価割れセール枠】定価より安く、割引率が高いアイテム
  const discountCandidates = [...validItems]
    .filter(i => i.discountRate > 0 && !selectedCodes.has(i.style_code))
    .sort((a, b) => b.discountRate - a.discountRate);

  if (discountCandidates.length > 0) {
    addIfUnique(discountCandidates[0], 'discount', '🔥 定価割れお買い得');
  }

  // 3. 【トレンド・話題モデル枠】NIPPON MADE, 9060などの注目モデル
  const trendCandidates = [...validItems]
    .filter(i => i.isTrend && !selectedCodes.has(i.style_code))
    .sort((a, b) => (b.discountRate || 0) - (a.discountRate || 0));

  if (trendCandidates.length > 0) {
    addIfUnique(trendCandidates[0], 'trend', '✨ SNS・街で大人気');
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

function cleanTag(str) {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
}

function generatePostDrafts(selectedItems) {
  const drafts = selectedItems.map((item, index) => {
    const itemUrl = `${siteBaseUrl}/item/${item.style_code}`;
    const brandTag = cleanTag(item.brand);
    const modelTag = cleanTag(item.model);

    let hookText = '';
    let priceDetails = '';

    if (item.category === 'price_drop' && item.priceDrop > 0) {
      hookText = `＼急浮上！人気スニーカーが値下がり中📉／\n「${item.name}」が前回の最安値から【¥${formatYen(item.priceDrop)} 値下げ】されています！`;
      priceDetails = item.listPrice
        ? `定価：¥${formatYen(item.listPrice)}\n現在の最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF）`
        : `現在の最安値：¥${formatYen(item.latestPrice)}`;
    } else if (item.category === 'discount' && item.discountRate > 0) {
      hookText = `＼定価割れセール速報🚨お買い得チャンス／\n「${item.name}」が国内定価より大幅プライスダウン中！`;
      priceDetails = `定価：¥${formatYen(item.listPrice)}\n➜ 現在の最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF / -¥${formatYen(item.discountAmount)}）`;
    } else if (item.category === 'trend') {
      hookText = `＼今季大本命！話題のトレンドスニーカー🔥／\nストリートやSNSで人気沸騰中の「${item.name}」の最新相場をチェック！`;
      priceDetails = item.latestPrice
        ? (item.listPrice
            ? `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}`
            : `現在の最安値：¥${formatYen(item.latestPrice)}`)
        : `最新の在庫状況と価格推移を更新中！`;
    } else {
      hookText = `＼本日のスニーカー最安値速報👟／\n一足は持っておきたい定番人気モデル「${item.name}」の最新価格！`;
      priceDetails = item.latestPrice
        ? (item.listPrice && item.discountRate > 0
            ? `定価：¥${formatYen(item.listPrice)} ➜ 最安値：¥${formatYen(item.latestPrice)}（約${item.discountRate}%OFF）`
            : `現在の最安値：¥${formatYen(item.latestPrice)}`)
        : `最新の在庫状況をリアルタイムで追跡中！`;
    }

    const hashtags = [
      '#スニーカー',
      '#スニーカー好きと繋がりたい',
      '#SNEAKERCHECKER',
      brandTag ? `#${brandTag}` : '',
      modelTag && modelTag !== brandTag ? `#${modelTag}` : ''
    ].filter(Boolean).join(' ');

    const parentTweet = `${hookText}\n\n${priceDetails}\n\n狙っていた方はサイズがあるうちにチェックがおすすめです👀✨\n\n${hashtags}`;

    const childTweet = `【${item.name}】\n（型番: ${item.style_code}）\n\n▼現在の最安値ショップと価格推移グラフはこちら👇\n${itemUrl}`;

    return {
      index: index + 1,
      item,
      parentTweet,
      childTweet,
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
  md += `Bufferなどの予約投稿ツールへそのままコピペして利用できるスレッド形式（親ツイート＋子ツイート）です。\n\n`;

  drafts.forEach((draft) => {
    md += `### 📌 投稿 ${draft.index}：【${draft.item.badge}】${draft.item.name}\n\n`;
    md += `**【親ツイート】**（1ツイート目にコピペ & 画像を1枚添付）\n`;
    md += `> 💡 **投稿時の注意**: ${draft.imageNote}\n\n`;
    md += "```text\n" + draft.parentTweet + "\n```\n\n";

    md += `**【子ツイート】**（スレッド返信としてコピペ）\n\n`;
    md += "```text\n" + draft.childTweet + "\n```\n\n";
    md += `---\n\n`;
  });

  return md;
}

async function main() {
  try {
    console.log('🚀 X投稿用ドラフト生成処理を開始します...');

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