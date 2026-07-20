import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import styles from '@/app/page.module.css';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const brandSlug = resolvedParams.brandSlug;
  const brandName = brandSlug.replace(/-/g, ' ').replace(/w/g, c => c.toUpperCase());

  return {
    title: `${brandName} のスニーカー相場・最安値一覧 | Sneaker Checker`,
    description: `${brandName} の人気スニーカーの相場、定価、最安値推移をデータベースで一覧表示。お買い得なスニーカーを探せます。`,
  };
}

export default async function BrandPage({ params }: PageProps) {
  const resolvedParams = await params;
  const brandSlug = resolvedParams.brandSlug;
  
  // スラッグからブランド名への変換 (例: onitsuka-tiger -> Onitsuka Tiger)
  // ただしDB内の正確な表記と大文字小文字が異なる場合があるため、ilikeで検索
  const brandQuery = brandSlug.replace(/-/g, ' ');

  const { data: sneakers, error } = await supabase
    .from('sneakers')
    .select('*, price_histories(*)')
    .ilike('brand', brandQuery);

  if (error || !sneakers || sneakers.length === 0) {
    notFound();
  }

  // 最新の価格履歴を取得してフォーマット
  const displayItems = sneakers.map((snk: any) => {
    // 履歴がある場合は最新のものを取得
    let currentLowest = 0;
    if (snk.price_histories && snk.price_histories.length > 0) {
      // 日付降順でソートして最新を取得
      const sorted = snk.price_histories.sort((a: any, b: any) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      currentLowest = sorted[0].lowest_price;
    }
    return { ...snk, currentLowest };
  });

  const displayBrand = sneakers[0].brand;

  return (
    <div className={styles.main}>
      <div className={styles.heroSection} style={{ padding: '3rem 1rem 2rem' }}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{displayBrand} 相場データベース</h1>
          <p className={styles.heroSubtitle}>
            {displayBrand} のスニーカーの最安値と価格推移を記録しています。
          </p>
        </div>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.grid}>
          {displayItems.map((item) => (
            <Link href={`/item/${item.style_code}`} key={item.style_code} className={styles.card}>
              <div className={styles.badgeContainer}>
                {item.currentLowest > 0 && item.list_price && item.currentLowest < item.list_price && (
                  <div className={styles.popularBadge} style={{ background: '#34c759' }}>
                    定価割れ
                  </div>
                )}
              </div>
              <div className={styles.imageContainer}>
                <img
                  src={item.image_url || 'https://via.placeholder.com/400?text=No+Image'}
                  alt={item.name}
                  className={styles.image}
                />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.itemName} style={{ fontSize: '1rem', minHeight: '2.6em' }}>{item.name}</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>現在最安値</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                      {item.currentLowest > 0 ? `¥${item.currentLowest.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>定価</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', textDecoration: item.currentLowest > 0 && item.currentLowest < item.list_price ? 'line-through' : 'none' }}>
                      {item.list_price ? `¥${item.list_price.toLocaleString()}` : '不明'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}