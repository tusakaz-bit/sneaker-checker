/**
 * Cloudflare Workers カスタムエントリーポイント
 *
 * 【重要設計方針】
 * scheduled（Cronハンドラ）では、自サイトURL宛てのHTTP fetchは
 * Cloudflareのループ検出により無音で遮断される。
 * そのため、sync-prices のロジックをこのファイルに直接移植し、
 * Supabase・楽天API への通信を scheduled ハンドラから直接行う。
 */
import { default as nextHandler } from "./.open-next/worker.js";
import { createClient } from "@supabase/supabase-js";

// --- 定数 ---
const BATCH_LIMIT = 10;            // 1回のCronで処理する最大件数
const MIN_PRICE = 3000;            // 最低価格フィルター（円）
const DELAY_MS = 1500;             // 楽天APIレートリミット対策の待機時間（ms）
const GENRE_ID = "558885";         // 楽天市場：靴ジャンルID
const EXCLUDE_KEYWORDS = ["shoelace", "keychain", "socks", "insole", "t-shirt", "hoodie", "cap"];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 楽天APIとSupabaseを直接呼び出してスニーカー価格を同期する
 * @param {Record<string, string>} env - Cloudflare Workersの環境変数
 */
async function runSyncPrices(env) {
  // 環境変数の取得
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const rakutenAppId = env.RAKUTEN_APP_ID || "";
  const rakutenAccessKey = env.RAKUTEN_ACCESS_KEY || "";
  const rakutenAffiliateId = env.RAKUTEN_AFFILIATE_ID || env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || "";
  const rawUrl = (env.RAKUTEN_APP_URL || "sneaker-checker.com").replace(/^"|"$/g, "");
  const appUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  if (!supabaseUrl || !supabaseKey || !rakutenAppId || !rakutenAccessKey) {
    throw new Error("必要な環境変数が不足しています（Supabase/楽天API）");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. 全スニーカー一覧を取得
  const { data: sneakers, error: fetchError } = await supabase
    .from("sneakers")
    .select("style_code, name, brand, image_url");

  if (fetchError || !sneakers) {
    throw new Error(`スニーカー一覧の取得に失敗: ${fetchError?.message}`);
  }

  // 2. 本日既に同期済みのスタイルコードを取得
  const { data: todayHistories, error: histError } = await supabase
    .from("price_histories")
    .select("style_code")
    .eq("recorded_at", todayStr);

  if (histError) {
    console.warn("[Cron] 本日の履歴取得失敗（処理は続行）:", histError.message);
  }

  const syncedCodes = new Set((todayHistories || []).map((h) => h.style_code));
  const unsyncedSneakers = sneakers.filter((s) => !syncedCodes.has(s.style_code));

  // 未同期スニーカーを優先して最大BATCH_LIMIT件処理
  const targetSneakers = unsyncedSneakers.slice(0, BATCH_LIMIT);

  console.log(
    `[Cron] 対象: ${targetSneakers.length}件 (未同期: ${unsyncedSneakers.length}件, 済: ${syncedCodes.size}件)`
  );

  const updatedItems = [];
  const skippedItems = [];

  for (const sneaker of targetSneakers) {
    // 楽天APIレートリミット対策
    await delay(DELAY_MS);

    try {
      // 楽天APIリクエストパラメータ組み立て
      const params = new URLSearchParams({
        applicationId: rakutenAppId,
        accessKey: rakutenAccessKey,
        keyword: sneaker.style_code,
        availability: "1",
        sort: "+itemPrice",
        hits: "30",
        imageFlag: "1",
        format: "json",
        minPrice: String(MIN_PRICE),
        genreId: GENRE_ID,
      });
      if (rakutenAffiliateId) params.set("affiliateId", rakutenAffiliateId);

      const rakutenUrl = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`;

      const res = await fetch(rakutenUrl, {
        headers: { Referer: appUrl, Origin: appUrl },
      });
      const data = await res.json();

      if (!res.ok || data.errors) {
        console.error(`[Cron] 楽天APIエラー (${sneaker.style_code}):`, JSON.stringify(data.errors));
        skippedItems.push({ styleCode: sneaker.style_code, reason: "API_ERROR", details: data.errors });
        continue;
      }

      // ノイズ（小物・靴紐等）を除外
      const validItems = (data.Items || []).filter((itemObj) => {
        const price = itemObj.Item.itemPrice;
        const title = itemObj.Item.itemName.toLowerCase();
        if (price < MIN_PRICE) return false;
        return !EXCLUDE_KEYWORDS.some((kw) => title.includes(kw));
      });

      if (validItems.length === 0) {
        skippedItems.push({ styleCode: sneaker.style_code, reason: "NO_VALID_ITEMS" });
        continue;
      }

      const lowestPrice = validItems[0].Item.itemPrice;
      const highestPrice = validItems.reduce((max, i) => Math.max(max, i.Item.itemPrice), lowestPrice);
      const shopCount = validItems.length;

      // Supabase へ upsert（既存レコードは更新、なければ挿入）
      const { error: upsertError } = await supabase
        .from("price_histories")
        .upsert(
          {
            style_code: sneaker.style_code,
            lowest_price: lowestPrice,
            highest_price: highestPrice,
            shop_count: shopCount,
            recorded_at: todayStr,
          },
          { onConflict: "style_code,recorded_at" }
        );

      if (upsertError) {
        console.error(`[Cron] DBアップサートエラー (${sneaker.style_code}):`, upsertError.message);
        skippedItems.push({ styleCode: sneaker.style_code, reason: "DB_ERROR", details: upsertError.message });
      } else {
        updatedItems.push(sneaker.style_code);
        console.log(`[Cron] 更新成功: ${sneaker.style_code} → ¥${lowestPrice.toLocaleString()}`);
      }
    } catch (err) {
      // 1件エラーが起きても残りの処理を続行（Fault Tolerance）
      console.error(`[Cron] 処理例外 (${sneaker.style_code}):`, err.message);
      skippedItems.push({ styleCode: sneaker.style_code, reason: "EXCEPTION", details: err.message });
    }
  }

  return {
    processed_count: targetSneakers.length,
    updated_count: updatedItems.length,
    updated: updatedItems,
    skipped: skippedItems,
    unsynced_remaining: Math.max(0, unsyncedSneakers.length - targetSneakers.length),
  };
}

/**
 * Discord Webhook通知（DISCORD_WEBHOOK_URL が設定されている場合のみ送信）
 * @param {string} webhookUrl
 * @param {string} message
 */
async function notifyDiscord(webhookUrl, message) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    console.log("[Cron] Discord通知送信完了");
  } catch (err) {
    console.error("[Cron] Discord通知失敗:", err.message);
  }
}

export default {
  // Next.js の通常HTTPリクエストをそのまま処理
  fetch: nextHandler.fetch,

  /**
   * Cronトリガーハンドラ（wrangler.jsonc の schedule: "0 18 * * *" で発火）
   * ★ 外部HTTPフェッチは使用しない（Cloudflareのループ遮断を回避）
   * ★ ctx.waitUntil により、処理完了まで Worker が強制終了されない
   */
  async scheduled(controller, env, ctx) {
    const timestamp = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron:START] Triggered at: ${timestamp}`);

    const discordWebhookUrl = env.DISCORD_WEBHOOK_URL || "";

    ctx.waitUntil(
      runSyncPrices(env)
        .then(async (result) => {
          const summary =
            `[Cron:SUCCESS] Processed: ${result.processed_count}, ` +
            `Updated: ${result.updated_count}, Remaining: ${result.unsynced_remaining}`;
          console.log(summary);

          if (result.skipped.length > 0) {
            console.warn(`[Cron:SKIPPED] ${JSON.stringify(result.skipped)}`);
          }

          // エラー率が50%以上 → Discord警告通知
          const realErrors = result.skipped.filter((s) => s.reason !== "NO_VALID_ITEMS");
          const errorRate = result.processed_count > 0 ? realErrors.length / result.processed_count : 0;
          if (errorRate >= 0.5 && discordWebhookUrl) {
            await notifyDiscord(
              discordWebhookUrl,
              `⚠️ **[SNEAKER CHECKER] Cronジョブ警告**\n` +
              `処理: ${result.processed_count}件 / 更新: ${result.updated_count}件\n` +
              `エラー率: ${Math.round(errorRate * 100)}%\n` +
              `時刻: ${timestamp}\n` +
              `詳細: \`\`\`${JSON.stringify(realErrors, null, 2).substring(0, 500)}\`\`\``
            );
          }
        })
        .catch(async (err) => {
          console.error("[Cron:CRITICAL]", err.stack || err);
          // 致命的エラー → Discord緊急通知
          if (discordWebhookUrl) {
            await notifyDiscord(
              discordWebhookUrl,
              `🚨 **[SNEAKER CHECKER] Cronジョブ完全失敗**\n` +
              `エラー: ${err.message}\n` +
              `時刻: ${timestamp}`
            );
          }
        })
    );
  },
};
