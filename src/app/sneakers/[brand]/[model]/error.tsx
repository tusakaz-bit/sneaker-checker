'use client';

import { useEffect } from 'react';
import styles from '@/app/page.module.css';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.main}>
      <div style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>
        <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold' }}>
          ← トップページに戻る
        </Link>
      </div>
      
      <div className={styles.noticeBoard} style={{ borderLeftColor: 'var(--accent)', maxWidth: '600px', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--accent)', marginBottom: '1rem' }}>通信エラーが発生しました</h2>
        <p className={styles.noticeText} style={{ marginBottom: '1rem' }}>
          楽天APIの混雑、もしくは在庫データの取得に失敗しました。<br/>
          お手数ですが、少し時間をおいてから再度お試しください。
        </p>
        <button
          onClick={() => reset()}
          className={styles.buyButton}
          style={{ width: 'auto', padding: '0.75rem 2rem', background: 'var(--accent)', color: '#fff', cursor: 'pointer', border: 'none' }}
        >
          再読み込みする
        </button>
      </div>
    </main>
  );
}
