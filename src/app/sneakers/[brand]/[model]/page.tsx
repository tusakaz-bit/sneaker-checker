import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { searchRakutenItems } from '@/lib/rakuten';
import { deslugify, getRakutenDayInfo } from '@/lib/utils';
import { SNEAKER_CATALOG } from '@/app/data/sneakerCatalog';
import styles from '@/app/page.module.css';
import Link from 'next/link';

type Params = Promise<{ brand: string; model: string }>;
type SearchParams = Promise<{ color?: string; size?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { brand, model } = await params;
  const brandName = deslugify(brand);
  const modelName = deslugify(model);

  const formatName = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase());
  const displayBrand = formatName(brandName);
  const displayModel = formatName(modelName);

  return {
    title: `2026年最新: ${displayBrand} ${displayModel} の最安値・在庫状況まとめ | Sneaker Checker`,
    description: `プレ値必須の人気スニーカー「${displayBrand} ${displayModel}」の優良在庫をリアルタイム比較。一番安く安心して買えるショップを探せます。送料無料やレビューも一目で確認可能！`,
  };
}

export default async function SneakerPage(props: { params: Params, searchParams: SearchParams }) {
  const { brand, model } = await props.params;
  const searchParams = await props.searchParams;
  
  const brandName = deslugify(brand);
  const modelName = deslugify(model);
  
  const formatName = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase());
  const displayBrand = formatName(brandName);
  const displayModel = formatName(modelName);

  const rakutenDay = getRakutenDayInfo();
  const colorParam = searchParams.color;
  const color = colorParam && colorParam !== '指定なし' ? colorParam.replace(/[()\/]/g, ' ') : '';
  const size = searchParams.size || '';
  
  const searchQuery = `${displayBrand} ${displayModel} ${color} ${size} スニーカー`.trim().replace(/\s+/g, ' ');

  let items = [];
  let errorMsg = null;

  try {
    items = await searchRakutenItems({ keyword: searchQuery, brand: displayBrand });
  } catch (error: any) {
    errorMsg = error.message;
  }

  const renderStars = (average: number) => {
    const fullStars = Math.floor(average);
    const hasHalfStar = average % 1 >= 0.5;
    let stars = "";
    for (let i = 0; i < fullStars; i++) stars += "★";
    if (hasHalfStar) stars += "☆";
    while (stars.length < 5) stars += "☆";
    return stars;
  };

  const lowestPrice = items.length > 0 ? Math.min(...items.map((i: any) => i.itemPrice)) : 0;
  const firstImage = items.length > 0 && items[0].mediumImageUrls?.length > 0 
    ? items[0].mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '?_ex=600x600') 
    : null;

  return (
    <main className={styles.main}>
      <div style={{ width: '100%', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/" style={{ color: 'var(--foreground-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
              ← Back to Browse
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
            {firstImage && (
              <div style={{ flex: '1 1 300px', maxWidth: '400px', background: '#f7f7f7', borderRadius: '12px', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                <img src={firstImage} alt={displayModel} style={{ width: '100%', objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ flex: '2 1 400px' }}>
              <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--foreground-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{displayBrand}</p>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.03em' }}>{displayModel}</h1>
              {color || size ? (
                <p style={{ fontSize: '1rem', color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>{color} {size}</p>
              ) : null}
              
              {items.length > 0 && (
                <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'inline-block' }}>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>Lowest Ask</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>&yen;{lowestPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {(rakutenDay.isToday || rakutenDay.isTomorrow) && (
          <div className={styles.saleBanner} style={{ marginBottom: '2rem' }}>
            {rakutenDay.isToday ? '🔥 本日は「0と5のつく日」！楽天ポイント5倍デー！ 🔥' : '🔔 明日は「0と5のつく日」！楽天ポイント5倍デー！ 🔔'}
          </div>
        )}

        {errorMsg ? (
          <div className={styles.noticeBoard}>
            <p className={styles.noticeText}>❌ {errorMsg}</p>
          </div>
        ) : (
          <>
            <div className={styles.seoContent} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '3rem', lineHeight: '1.6' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', color: 'var(--accent)' }}>💡 {displayBrand} {displayModel} の価格・在庫分析レポート</h2>
              {items.length > 0 ? (() => {
                const freeShippingCount = items.filter((i: any) => i.postageFlag === 0).length;
                return (
                  <p>
                    現在、楽天に出品されている<strong>「{displayBrand} {displayModel} {color} {size}」</strong>の在庫状況を独自システムで分析したところ、<strong>{items.length}件の優良在庫</strong>が見つかりました。<br />
                    現在の<strong>最安値は ¥{lowestPrice.toLocaleString()}</strong> からとなっています。そのうち、送料無料のショップは{freeShippingCount}店舗存在します。<br />
                    偽物や悪質な出品を避けるため、当店では「ショップレビューが高く、信頼できる出品者」を中心に、安い順で並び替えて掲載しています。プレ値変動の前に、マイサイズがないかチェックしてみてください。
                  </p>
                );
              })() : (
                <p>
                  現在、<strong>「{displayBrand} {displayModel} {color} {size}」</strong>に一致する優良在庫は見つかりませんでした。<br />
                  このモデルは非常に人気が高いため、入荷してもすぐに売り切れてしまう傾向があります。サイズやカラーの指定を外すか、別のモデルで再検索してみてください。
                </p>
              )}
            </div>

            {items.length > 0 && (
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Available Listings ({items.length})</h2>
            )}
            <div className={styles.grid}>
              {items.map((item: any) => (
                <a href={item.affiliateUrl || item.itemUrl} target="_blank" rel="noopener noreferrer" key={item.itemCode} className={styles.card}>
                  <div className={styles.badgeContainer}>
                    {item.pointRate > 1 && (
                      <div className={styles.pointBadge}>Pt {item.pointRate}x</div>
                    )}
                    {item.reviewCount >= 5 && item.reviewAverage >= 4.0 && (
                      <div className={styles.popularBadge}>Popular</div>
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
                      <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:"0.875rem" }}>No Image</div>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <p className={styles.shopName}>{item.shopName}</p>
                    <h3 className={styles.itemName}>{item.itemName}</h3>
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Lowest Ask</span>
                      <span className={styles.price}>
                        &yen;{item.itemPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
