/**
 * Cloudflare Workers カスタムエントリーポイント
 * - fetch: Next.jsのルーティングをそのまま処理
 * - scheduled: Cronトリガー（毎日自動実行）でsync-prices APIを呼び出す
 */

// OpenNextのビルド済みワーカーを読み込む
import { default as nextHandler } from "./.open-next/worker.js";

export default {
  // Next.jsのHTTPリクエストハンドラをそのまま継承
  fetch: nextHandler.fetch,

  /**
   * Cronトリガーハンドラ
   * wrangler.jsonc の triggers.crons で設定したスケジュールで実行される
   */
  async scheduled(
    controller,
    env,
    ctx
  ) {
    console.log(
      `[Cron] scheduled triggered at: ${new Date(controller.scheduledTime).toISOString()}`
    );

    const cronSecret = env.CRON_SECRET || "";
    const siteUrl = "https://sneaker-checker.com";
    const syncUrl = `${siteUrl}/api/cron/sync-prices?secret=${encodeURIComponent(cronSecret)}&limit=10`;

    try {
      const res = await fetch(syncUrl, {
        headers: {
          "User-Agent": "Cloudflare-Cron/1.0",
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log(
          `[Cron] sync-prices completed: updated_count=${data.updated_count}, skipped=${data.skipped?.length}`
        );
      } else {
        const text = await res.text();
        console.error(
          `[Cron] sync-prices failed: ${res.status} ${res.statusText} - ${text}`
        );
      }
    } catch (err) {
      console.error("[Cron] Failed to call sync-prices:", err);
    }
  },
};

