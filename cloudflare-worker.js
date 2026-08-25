import { default as nextHandler } from "./.open-next/worker.js";

export default {
  fetch: nextHandler.fetch,

  async scheduled(controller, env, ctx) {
    const timestamp = new Date(controller.scheduledTime).toISOString();
    console.log(`[Cron:START] Triggered at: ${timestamp}`);

    const cronSecret = env.CRON_SECRET || "";
    const siteUrl = "https://sneaker-checker.com";
    
    // 1回のバッチ処理件数を10件に制限（Cloudflareの50サブリクエスト制限回避のため）
    const syncUrl = `${siteUrl}/api/cron/sync-prices?secret=${encodeURIComponent(cronSecret)}&limit=10`;

    try {
      // 内部呼び出し (外部fetchではなくnextHandlerへ直接Requestを渡す)
      const req = new Request(syncUrl, {
        headers: { "User-Agent": "Cloudflare-Cron/1.0" },
      });
      
      const res = await nextHandler.fetch(req, env, ctx);

      if (res.ok) {
        const data = await res.json();
        console.log(`[Cron:SUCCESS] Processed: ${data.processed_count}, Updated: ${data.updated_count}, Remaining: ${data.unsynced_remaining}`);
        if (data.skipped && data.skipped.length > 0) {
          console.warn(`[Cron:WARNING] Skipped items:`, JSON.stringify(data.skipped));
        }
      } else {
        const text = await res.text();
        console.error(`[Cron:FAILED] HTTP ${res.status} ${res.statusText}`);
        console.error(`[Cron:FAILED_DETAILS] ${text}`);
      }
    } catch (err) {
      console.error("[Cron:CRITICAL] Fatal error during sync-prices execution:");
      console.error(err.stack || err);
    }
  },
};
