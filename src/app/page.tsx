import styles from "./page.module.css";
import { SNEAKER_CATALOG } from "./data/sneakerCatalog";
import { slugify, getRakutenDayInfo, getRandomViewerCount } from "@/lib/utils";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HeroSearchBox from "@/components/HeroSearchBox";

export default async function Home() {
  const rakutenDay = getRakutenDayInfo();
  
  // 完全SSR: サーバー側でタイムライン（人気商品）を取得
  
  // 完全SSR: サーバー側でタイムライン（人気商品）をデータベースから取得
  const { data: dbItems } = await supabase
    .from('sneakers')
    .select('*, price_histories(*)')
    .limit(10);
    
  const timelineItems = (dbItems || []).map((snk: any) => {
    let currentLowest = 0;
    if (snk.price_histories && snk.price_histories.length > 0) {
      const sorted = snk.price_histories.sort((a: any, b: any) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      currentLowest = sorted[0].lowest_price;
    }
    return { ...snk, currentLowest };
  });


  return (
    <main className={styles.main}>
      {/* ヒーローセクション (SSR + クライアント検索ボックス) */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Find Your Best Pair</h1>
          <p className={styles.heroSubtitle}>
            人気のレアスニーカーや限定モデルの最安値をリアルタイムで一括比較。<br/>各ショップの価格差がひと目でわかるので、もう相場より高く買ってしまう心配はありません。
          </p>
          
          {/* クライアントコンポーネント: インタラクティブな検索UI */}
          <HeroSearchBox />
          <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", marginTop: "1rem" }}>※当サイトに掲載されているスニーカーは、すべて楽天市場の厳しい審査をクリアした公式ストアのデータを使用しています。偽物の心配なく安全に最安値をお探しいただけます。</p>
        </div>
      </section>

      {/* コンテンツエリア (完全SSR) */}
      <div className={styles.contentArea}>
        {(rakutenDay.isToday || rakutenDay.isTomorrow) && (
          <div className={styles.saleBanner} style={{ marginBottom: '2rem' }}>
            {rakutenDay.isToday ? '🔥 本日は「0と5のつく日」！楽天ポイント5倍デー！ 🔥' : '🔔 明日は「0と5のつく日」！楽天ポイント5倍デー！ 🔔'}
          </div>
        )}

        <div className={styles.timelineHeader} style={{ marginTop: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>トレンド新着・再入荷</h2>
          <p className={styles.subtitle} style={{ margin: 0 }}>
            人気モデルの最新入荷・更新情報を表示しています
          </p>
        </div>

        
        {timelineItems.length > 0 ? (
          <div className={styles.grid}>
            {timelineItems.map((item: any, idx: number) => (
              <Link href={`/item/${item.style_code}`} key={`${item.style_code}-${idx}`} className={styles.card}>
                <div className={styles.badgeContainer}>
                  <div className={styles.newBadge}>NEW</div>
                  {item.currentLowest > 0 && item.list_price && item.currentLowest < item.list_price && (
                    <div className={styles.popularBadge} style={{ background: '#34c759' }}>定価割れ</div>
                  )}
                </div>
                <div className={styles.imageContainer}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa" }}>No Image</div>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.shopName}>{item.brand} {item.model}</p>
                  <h3 className={styles.itemName} style={{ minHeight: '2.6em' }}>{item.name}</h3>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>最安値</span>
                    <span className={styles.price}>
                      {item.currentLowest > 0 ? `¥${item.currentLowest.toLocaleString()}` : '-'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.noticeText}>新着情報が見つかりませんでした。</p>
        )}

        {/* SEO用の静的リンク群 */}
        <section className={styles.seoLinksSection} style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', textAlign: 'left', fontWeight: 'bold' }}>人気のブランド・モデル一覧</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {Object.keys(SNEAKER_CATALOG).map(b => (
              <div key={b}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--foreground)', fontWeight: 'bold' }}>
                  <Link href={`/brand/${slugify(b)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {b}
                  </Link>
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {Object.keys(SNEAKER_CATALOG[b]).map(m => (
                    <li key={m} style={{ marginBottom: '0.5rem' }}>
                      <Link href={`/model/${slugify(m)}`} style={{ color: 'var(--foreground-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        {m}
                      </Link>
                    </li>
                  ))}
                  <li style={{ marginTop: '0.5rem' }}>
                    <Link href={`/brand/${slugify(b)}`} style={{ color: '#00d084', textDecoration: 'underline', fontSize: '0.875rem' }}>
                      {b} のスニーカーをすべて見る →
                    </Link>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

