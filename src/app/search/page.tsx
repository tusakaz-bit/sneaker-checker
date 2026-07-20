import { searchRakutenItems } from "@/lib/rakuten";
import styles from "@/app/page.module.css";
import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '検索結果 | Sneaker Checker',
  description: 'スニーカーの最安値を検索します',
};

export default async function SearchPage(props: { searchParams: Promise<{ q: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";

  let items = [];
  let errorMsg = null;

  try {
    if (q) {
      items = await searchRakutenItems({ keyword: q });
    }
  } catch (error: any) {
    errorMsg = error.message;
  }

  return (
    <main className={styles.main}>
      <div style={{ width: '100%', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/" style={{ color: 'var(--foreground-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← トップページに戻る
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>「{q}」の検索結果</h1>
        </div>
      </div>

      <div className={styles.contentArea}>
        {errorMsg ? (
          <div className={styles.noticeBoard}>
            <p className={styles.noticeText}>❌ {errorMsg}</p>
          </div>
        ) : items.length > 0 ? (
          <>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>{items.length}件のアイテムが見つかりました。</p>
            <div className={styles.grid}>
              {items.map((item: any) => (
                <a href={item.affiliateUrl || item.itemUrl} target="_blank" rel="noopener noreferrer" key={item.itemCode} className={styles.card}>
                  <div className={styles.badgeContainer}>
                    {item.pointRate > 1 && (
                      <div className={styles.pointBadge}>Pt {item.pointRate}x</div>
                    )}
                    {item.reviewCount >= 5 && item.reviewAverage >= 4.0 && (
                      <div className={styles.popularBadge}>🌟 高評価</div>
                    )}
                  </div>
                  <div className={styles.imageContainer}>
                    {item.mediumImageUrls && item.mediumImageUrls.length > 0 ? (
                      <img
                        src={item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '?_ex=400x400')}
                        alt={item.itemName}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa" }}>No Image</div>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <p className={styles.shopName}>{item.shopName}</p>
                    <h3 className={styles.itemName}>{item.itemName}</h3>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>最安値</span>
                      <span className={styles.price}>
                        &yen;{item.itemPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : q ? (
           <p className={styles.noticeText}>条件に合うスニーカーが見つかりませんでした。別のキーワードをお試しください。</p>
        ) : (
           <p className={styles.noticeText}>キーワードを入力して検索してください。</p>
        )}
      </div>
    </main>
  );
}

