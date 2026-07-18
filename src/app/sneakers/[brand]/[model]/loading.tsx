import styles from '@/app/page.module.css';

export default function Loading() {
  const skeletons = Array(8).fill(null);

  return (
    <main className={styles.main}>
      <div style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>
        <span style={{ color: 'var(--foreground-muted)', fontWeight: 'bold' }}>
          ← 検索中...
        </span>
      </div>

      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>最新の最安値・在庫データを検索中...</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.5rem' }}>楽天APIからリアルタイムで取得しています</p>
      </div>

      <div className={styles.skeletonGrid}>
        {skeletons.map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonText} style={{ width: '90%' }}></div>
              <div className={styles.skeletonText} style={{ width: '60%', marginBottom: '1rem' }}></div>
              <div className={styles.skeletonText} style={{ width: '40%', marginTop: 'auto' }}></div>
              <div className={styles.skeletonText} style={{ width: '100%', height: '2.5rem', marginTop: '0.5rem' }}></div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
