import { default as nextHandler } from "./.open-next/worker.js";

export default {
  // Next.jsのHTTPリクエストハンドラをそのまま継承
  fetch: nextHandler.fetch,

  /**
   * Cronトリガーハンドラ（毎日UTC 18:00 = JST 翌3:00）
   *
   * ★重要仕様★
   * nextHandler.fetch() を使う内部呼び出しは、scheduledハンドラと
   * サブリクエスト制限（50回）を共有してしまうため使用禁止。
   * 外部fetch（自サイトURL宛て）は新しいWorkerコンテキストを生成するので、
   * サブリクエスト枠が独立し、route.tsが自由に通信できる。
   */
  async scheduled(controller, env, ctx) {
    const timestamp = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron:START] Triggered at: ${timestamp}`);

    const cronSecret = env.CRON_SECRET || "";
    // limit=10 でバッチ処理（1回のWorkerで楽天API10回+Supabase20回=30回以内）
    const syncUrl = `https://sneaker-checker.com/api/cron/sync-prices?secret=${encodeURIComponent(cronSecret)}&limit=10`;

    // ctx.waitUntil でCloudflareに「非同期処理が終わるまで待て」と明示
    ctx.waitUntil(
      fetch(syncUrl, {
        headers: {
          "User-Agent": "Cloudflare-Cron/1.0",
          "x-cron-trigger": "scheduled",
        },
      })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          console.log(`[Cron:SUCCESS] Processed: ${data.processed_count}, Updated: ${data.updated_count}, Remaining: ${data.unsynced_remaining}`);
          if (data.skipped && data.skipped.length > 0) {
            console.warn(`[Cron:WARNING] Skipped: ${JSON.stringify(data.skipped)}`);
          }
        } else {
          const text = await res.text();
          console.error(`[Cron:FAILED] HTTP ${res.status} ${res.statusText} - ${text}`);
        }
      })
      .catch((err) => {
        console.error("[Cron:CRITICAL] Fatal error:");
        console.error(err.stack || String(err));
      })
    );
  },
};
