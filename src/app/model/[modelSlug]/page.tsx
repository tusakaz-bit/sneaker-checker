export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import styles from '@/app/page.module.css';
import Link from 'next/link';
import SneakerImage from '@/components/SneakerImage';
import Breadcrumbs from '@/components/Breadcrumbs';
import { slugify } from '@/lib/utils';
import { SNEAKER_CATALOG } from '@/app/data/sneakerCatalog';
import sneakerContent from '@/data/sneakerContent.json';
import seoOverrides from '@/data/seo_overrides.json';

interface PageProps {
  params: Promise<{ modelSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const modelSlug = resolvedParams.modelSlug;
  const modelName = modelSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  const currentPath = `/model/${modelSlug}`;
  const override = (seoOverrides as any)[currentPath];

  return {
    title: override?.title || `${modelName} のスニーカー相場・最安値一覧 | Sneaker Checker`,
    description: override?.description || `${modelName} の人気スニーカーの相場、定価、最安値推移をデータベースで一覧表示。お買い得なスニーカーを探せます。`,
    keywords: override?.keywords,
    alternates: {
      canonical: currentPath,
    },
  };
}

export default async function ModelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const modelSlug = resolvedParams.modelSlug;
  
  // スラグから検索用クエリの生成
  let modelQuery = modelSlug.replace(/-/g, ' ');
  let actualModelName = modelQuery;
  
  let actualBrandName = "";
  // カタログから正確なモデル名を取得（カッコなどがslugifyで消えている場合に対応）
  for (const brand of Object.keys(SNEAKER_CATALOG)) {
    for (const model of Object.keys(SNEAKER_CATALOG[brand])) {
      if (slugify(model) === modelSlug) {
        actualModelName = model;
        actualBrandName = brand;
        break;
      }
    }
  }

  const { data: sneakers } = await supabase
    .from('sneakers')
    .select('*, price_histories(*)')
    .or(`model.ilike.%${actualModelName}%,slug.ilike.%${modelSlug}%,name.ilike.%${modelQuery}%`);

  const displayModel = actualModelName.toUpperCase();

  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '';
  const searchUrl = affiliateId
    ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(actualModelName)}/558885/?s=2`)}`
    : `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(actualModelName)}/558885/?s=2`;

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

  const displayBrand = sneakers && sneakers.length > 0 ? sneakers[0].brand : "";
  const actualModel = sneakers && sneakers.length > 0 ? (sneakers[0].model || displayModel) : displayModel;

  // JSONからコンテンツを取得
  let contentData: any = null;

  // 1. スラグやモデル名ベースでのマッチングを優先
  if ((sneakerContent as any)[modelSlug]) {
    contentData = (sneakerContent as any)[modelSlug];
  } else if ((sneakerContent as any)[actualModelName]) {
    contentData = (sneakerContent as any)[actualModelName];
  } else if ((sneakerContent as any)[actualModelName.toLowerCase()]) {
    contentData = (sneakerContent as any)[actualModelName.toLowerCase()];
  }

  // 2. アイテムのstyle_codeベースでのマッチング
  if (!contentData && displayItems && displayItems.length > 0) {
    for (const item of displayItems) {
      const key = item.style_code;
      const bracketKey = `[${key}]`;
      if ((sneakerContent as any)[key]) {
        contentData = (sneakerContent as any)[key];
        break;
      }
      if ((sneakerContent as any)[bracketKey]) {
        contentData = (sneakerContent as any)[bracketKey];
        break;
      }
    }
  }

  // もしアイテムもコンテンツもない場合は、完全なプレースホルダーを表示して終了
  if ((!sneakers || sneakers.length === 0) && !contentData) {
    return (
      <div className={styles.main}>
        <div className={styles.heroSection} style={{ padding: '3rem 1rem 2rem' }}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{displayModel} - 特徴・サイズ感と最新価格情報</h1>
            <p className={styles.heroSubtitle}>
              {displayModel}の歴史やサイズ選びのポイントと合わせて、現在取得可能な最安値・ラインナップをご紹介します。
            </p>
          </div>
        </div>

        <div className={styles.contentArea} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            現在 `{displayModel}` のデータベースを同期・更新中です。
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={styles.buyButton}
            style={{ display: 'inline-block', padding: '1rem 2rem', background: '#bf0000', color: 'white', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}
          >
            楽天市場で {displayModel} の最安値を探す
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.heroSection} style={{ padding: '3rem 1rem 2rem' }}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{displayBrand} {actualModel} - 特徴・サイズ感と最新価格情報</h1>
          <p className={styles.heroSubtitle}>
            {actualModel}の歴史やサイズ選びのポイントと合わせて、現在取得可能な最安値・ラインナップをご紹介します。
          </p>
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* リッチコンテンツ */}
        {contentData && (
          <div style={{ marginBottom: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {contentData.history && (
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📖</span> モデルの歴史
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{contentData.history}</p>
              </div>
            )}
            {contentData.size_guide && (
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📏</span> サイズ感
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{contentData.size_guide}</p>
              </div>
            )}
            {contentData.styling && (
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👗</span> スタイリング
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{contentData.styling}</p>
              </div>
            )}
          </div>
        )}

        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>{actualModel}のアイテム・最新価格</h2>
        <div className={styles.grid}>
          {displayItems.length > 0 ? (
            displayItems.map((item: any) => (
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
            ))
          ) : contentData && contentData.heroImage ? (
            (() => {
              const match = contentData.heroImage.match(/\/([^/]+)\.(jpg|jpeg|png|webp)$/i);
              const fallbackStyleCode = match ? match[1].replace('-realphoto', '').replace('-real', '') : '';
              const fallbackLink = fallbackStyleCode ? `/item/${fallbackStyleCode}` : searchUrl;
              const displayItemName = contentData.heroItemName || actualModel;
              
              return (
                <Link href={fallbackLink} className={styles.card} style={{ textDecoration: 'none' }}>
                  <div className={styles.imageContainer}>
                    <img src={contentData.heroImage + "?v=8"} alt={displayItemName} className={styles.image} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                  </div>
                  <div className={styles.cardContent}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                      {(actualBrandName || displayBrand).toUpperCase()}
                    </p>
                    <h3 className={styles.itemName} style={{ fontSize: '1rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                      {displayItemName}
                    </h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                      {contentData.heroRetailPrice ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>現在最安値</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>-</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>定価</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                              ¥{contentData.heroRetailPrice.toLocaleString()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <div style={{ padding: '0.5rem', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                              現在、最新の価格情報を取得中です。
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })()
          ) : null}
        </div>
        
        {displayItems.length === 0 && (!contentData || !contentData.heroImage) && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', marginTop: '2rem' }}>
            <p style={{ color: 'var(--foreground-muted)' }}>現在、最新の価格情報を取得中です。</p>
          </div>
        )}
      </div>
    </div>
  );
}

