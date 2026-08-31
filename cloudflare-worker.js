/**
 * Cloudflare Workers カスタムエントリーポイント
 *
 * 【設計方針】
 * scheduled（Cron）ハンドラでは自サイトURL宛てのHTTP fetchは
 * Cloudflareのループ検出により遮断されるため、
 * Supabase・楽天APIへの通信をこのファイルから直接行う。
 *
 * 【サブリクエスト制限対策】
 * Cloudflare Workers無料プランは1起動あたり最大50サブリクエスト。
 * createClient に persistSession: false を指定して内部HTTPを削減。
 * バッチ件数を7件に制限（楽天7回 + Supabase14回 + 初期化2回 = 約23回）。
 */
import { default as nextHandler } from "./.open-next/worker.js";
import { createClient } from "@supabase/supabase-js";

// --- 定数 ---
const BATCH_LIMIT = 7;             // ★ 7件に削減（サブリクエスト50制限の余裕を確保）
const MIN_PRICE = 3000;
const DELAY_MS = 1500;
const GENRE_ID = "558885";
const EXCLUDE_KEYWORDS = ["shoelace", "keychain", "socks", "insole", "t-shirt", "hoodie", "cap"];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSyncPrices(env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const rakutenAppId = env.RAKUTEN_APP_ID || "";
  const rakutenAccessKey = env.RAKUTEN_ACCESS_KEY || "";
  const rakutenAffiliateId = env.RAKUTEN_AFFILIATE_ID || env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || "";
  const rawUrl = (env.RAKUTEN_APP_URL || "sneaker-checker.com").replace(/^"|"$/g, "");
  const appUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  if (!supabaseUrl || !supabaseKey || !rakutenAppId || !rakutenAccessKey) {
    throw new Error("必要な環境変数が不足しています（SUPABASE/RAKUTEN）");
  }

  // ★ persistSession: false で内部セッション管理HTTPを無効化（サブリクエスト削減）
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: sneakers, error: fetchError } = await supabase
    .from("sneakers")
    .select("style_code, name, brand, image_url");

  if (fetchError || !sneakers) {
    throw new Error(`スニーカー一覧の取得に失敗: ${fetchError?.message}`);
  }

  const { data: todayHistories, error: histError } = await supabase
    .from("price_histories")
    .select("style_code")
    .eq("recorded_at", todayStr);

  if (histError) {
    console.warn("[Cron] 本日の履歴取得失敗（処理は続行）:", histError.message);
  }

  const syncedCodes = new Set((todayHistories || []).map((h) => h.style_code));
  const unsyncedSneakers = sneakers.filter((s) => !syncedCodes.has(s.style_code));
  const targetSneakers = unsyncedSneakers.slice(0, BATCH_LIMIT);

  console.log(
    `[Cron] バッチ開始: ${targetSneakers.length}件処理 (未同期: ${unsyncedSneakers.length}件)`
  );

  const updatedItems = [];
  const skippedItems = [];

  for (const sneaker of targetSneakers) {
    await delay(DELAY_MS);

    try {
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
        skippedItems.push({ styleCode: sneaker.style_code, reason: "API_ERROR" });
        continue;
      }

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

      const { error: upsertError } = await supabase
        .from("price_histories")
        .upsert(
          {
            style_code: sneaker.style_code,
            lowest_price: lowestPrice,
            highest_price: highestPrice,
            shop_count: validItems.length,
            recorded_at: todayStr,
          },
          { onConflict: "style_code,recorded_at" }
        );

      if (upsertError) {
        console.error(`[Cron] DBエラー (${sneaker.style_code}):`, upsertError.message);
        skippedItems.push({ styleCode: sneaker.style_code, reason: "DB_ERROR", details: upsertError.message });
      } else {
        updatedItems.push(sneaker.style_code);
        console.log(`[Cron] 更新: ${sneaker.style_code} → ¥${lowestPrice.toLocaleString()}`);
      }
    } catch (err) {
      // 1件失敗しても残り全件を処理し続ける（Fault Tolerance）
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
  fetch: nextHandler.fetch,

  async scheduled(controller, env, ctx) {
    const timestamp = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron:START] ${timestamp} (batch_limit=${BATCH_LIMIT})`);

    const discordWebhookUrl = env.DISCORD_WEBHOOK_URL || "";

    ctx.waitUntil(
      runSyncPrices(env)
        .then(async (result) => {
          const msg = `[Cron:SUCCESS] Processed=${result.processed_count}, Updated=${result.updated_count}, Remaining=${result.unsynced_remaining}`;
          console.log(msg);
          if (result.skipped.length > 0) {
            console.warn("[Cron:SKIPPED]", JSON.stringify(result.skipped));
          }
          // エラー率50%超で警告通知
          const realErrors = result.skipped.filter((s) => s.reason !== "NO_VALID_ITEMS");
          if (realErrors.length > 0 && discordWebhookUrl) {
            await notifyDiscord(
              discordWebhookUrl,
              `⚠️ **[SNEAKER CHECKER] Cron警告 ${timestamp}**\n` +
              `更新: ${result.updated_count}/${result.processed_count}件\n` +
              `エラー: \`${JSON.stringify(realErrors).substring(0, 800)}\``
            );
          }
        })
        .catch(async (err) => {
          console.error("[Cron:CRITICAL]", err.stack || err);
          if (discordWebhookUrl) {
            await notifyDiscord(
              discordWebhookUrl,
              `🚨 **[SNEAKER CHECKER] Cron完全失敗 ${timestamp}**\nエラー: ${err.message}`
            );
          }
        })
    );
  },
};
