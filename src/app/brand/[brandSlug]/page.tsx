export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import styles from '@/app/page.module.css';
import Link from 'next/link';
import SneakerImage from '@/components/SneakerImage';
import Breadcrumbs from '@/components/Breadcrumbs';
import sneakerContent from '@/data/sneakerContent.json';
import seoOverrides from '@/data/seo_overrides.json';

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const brandSlug = resolvedParams.brandSlug;
  const brandName = brandSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  const currentPath = `/brand/${brandSlug}`;
  const override = (seoOverrides as any)[currentPath];

  return {
    title: override?.title || `${brandName} のスニーカー相場・最安値一覧 | Sneaker Checker`,
    description: override?.description || `${brandName} の人気スニーカーの相場、定価、最安値推移をデータベースで一覧表示。お買い得なスニーカーを探せます。`,
    keywords: override?.keywords,
    alternates: {
      canonical: currentPath,
    },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const resolvedParams = await params;
  const brandSlug = resolvedParams.brandSlug;
  const brandQuery = brandSlug.replace(/-/g, ' ');

  const { data: sneakers } = await supabase
    .from('sneakers')
    .select('*, price_histories(*)')
    .ilike('brand', brandQuery);

  const displayBrand = brandQuery.toUpperCase();

  
  let contentData: any = null;
  if ((sneakerContent as any)[brandSlug]) {
    contentData = (sneakerContent as any)[brandSlug];
  } else if ((sneakerContent as any)[brandQuery.toLowerCase()]) {
    contentData = (sneakerContent as any)[brandQuery.toLowerCase()];
  }

  // もしアイテムもコンテンツもない場合は、完全なプレースホルダーを表示して終了
  if ((!sneakers || sneakers.length === 0) && !contentData) {
    const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '';
    const searchUrl = affiliateId
      ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(brandQuery)}/558885/?s=2`)}`
      : `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(brandQuery)}/558885/?s=2`;

    return (
      <div className={styles.main}>
        <div className={styles.heroSection} style={{ padding: '3rem 1rem 2rem' }}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{displayBrand} - 特徴・サイズ感と最新価格情報</h1>
            <p className={styles.heroSubtitle}>
              {displayBrand}の歴史やサイズ選びのポイントと合わせて、現在取得可能な最安値・ラインナップをご紹介します。
            </p>
          </div>
        </div>

        <div className={styles.contentArea} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            現在 `{displayBrand}` のデータベースを同期・更新中です。
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyButton}
            style={{ display: 'inline-block', padding: '1rem 2rem', background: '#bf0000', color: 'white', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}
          >
            楽天市場で {displayBrand} の最安値を探す
          </a>
        </div>
      </div>
    );
  }

  const displayItems = (sneakers || []).map((snk: any) => {
    let currentLowest = 0;
    if (snk.price_histories && snk.price_histories.length > 0) {
      const sorted = snk.price_histories.sort((a: any, b: any) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      currentLowest = sorted[0].lowest_price;
    }
    return { ...snk, currentLowest };
  });

  const actualBrand = sneakers && sneakers.length > 0 ? (sneakers[0].brand || displayBrand) : displayBrand;

  return (
    <div className={styles.main}>
      <div className={styles.heroSection} style={{ padding: '3rem 1rem 2rem' }}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{actualBrand} - 特徴・サイズ感と最新価格情報</h1>
          <p className={styles.heroSubtitle}>
            {actualBrand}の歴史やサイズ選びのポイントと合わせて、現在取得可能な最安値・ラインナップをご紹介します。
          </p>
        </div>
      </div>

      <div className={styles.contentArea}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{actualBrand}のアイテム・最新価格</h2>
        {sneakers && sneakers.length > 0 ? (
          <div className={styles.grid}>
            {displayItems.map((item: any) => (
              <Link href={`/item/${item.style_code}`} key={item.style_code} className={styles.card}>
                <div className={styles.badgeContainer}>
                  {item.currentLowest > 0 && item.list_price && item.currentLowest < item.list_price && (
                    <div className={styles.popularBadge} style={{ background: '#34c759' }}>
                      定価割れ
                    </div>
                  )}
                </div>
                <div className={styles.imageContainer}>
                  <SneakerImage src={item.image_url} alt={item.name} styleCode={item.style_code} model={item.model} className={styles.image} />
                </div>
                <div className={styles.cardContent}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                    {item.brand.toUpperCase()}
                  </p>
                  <h3 className={styles.itemName} style={{ fontSize: '1rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>{item.name}</h3>
                  
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
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--foreground-muted)' }}>現在、最新の価格情報を取得中です。</p>
          </div>
        )}
      </div>
    </div>
  );
}