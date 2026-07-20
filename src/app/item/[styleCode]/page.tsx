import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PriceChart from '@/components/PriceChart';
import styles from '@/app/page.module.css';

interface PageProps {
  params: Promise<{ styleCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const styleCode = resolvedParams.styleCode;
  const { data: sneaker } = await supabase
    .from('sneakers')
    .select('*')
    .eq('style_code', styleCode)
    .single();

  if (!sneaker) {
    return { title: '商品が見つかりません | Sneaker Checker' };
  }

  return {
    title: `${sneaker.name} (${sneaker.style_code}) の相場・最安値推移 | Sneaker Checker`,
    description: `${sneaker.brand} ${sneaker.model} ${sneaker.name} (${sneaker.style_code}) の現在の最安値や過去の価格推移グラフを確認できます。`,
  };
}

export default async function ItemPage({ params }: PageProps) {
  const resolvedParams = await params;
  const styleCode = resolvedParams.styleCode;

  const { data: sneaker } = await supabase
    .from('sneakers')
    .select('*')
    .eq('style_code', styleCode)
    .single();

  if (!sneaker) {
    notFound();
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

  const { data: histories } = await supabase
    .from('price_histories')
    .select('*')
    .eq('style_code', styleCode)
    .gte('recorded_at', thirtyDaysAgo.toISOString().split('T')[0])
    .order('recorded_at', { ascending: true });

  let currentLowest = 0;
  let averagePrice = 0;
  let isLowestUpdated = false;
  let divergenceRate = null;

  if (histories && histories.length > 0) {
    const latest = histories[histories.length - 1];
    currentLowest = latest.lowest_price;

    const sum = histories.reduce((acc: any, curr: any) => acc + curr.lowest_price, 0);
    averagePrice = Math.round(sum / histories.length);

    const pastMin = Math.min(...histories.slice(0, -1).map((h: any) => h.lowest_price), Infinity);
    if (currentLowest < pastMin && histories.length > 1) {
      isLowestUpdated = true;
    }

    if (sneaker.list_price) {
      divergenceRate = Math.round(((currentLowest - sneaker.list_price) / sneaker.list_price) * 100);
    }
  }

  let explanationText = `${sneaker.name} (${sneaker.style_code}) の`;
  if (currentLowest > 0) {
    explanationText += `現在の最安値は ${currentLowest.toLocaleString()} 円です。`;
    if (averagePrice > 0) {
      const diff = Math.abs(currentLowest - averagePrice);
      const diffPercent = Math.round((diff / averagePrice) * 100);
      const highLow = currentLowest > averagePrice ? '高い' : '安い';
      explanationText += `過去の平均価格（${averagePrice.toLocaleString()} 円）と比較して約 ${diffPercent}% ${highLow}価格帯で推移しています。`;
    }
    if (divergenceRate !== null) {
      const overUnder = divergenceRate > 0 ? 'プレ値' : 'お買い得';
      explanationText += `定価 ${sneaker.list_price.toLocaleString()} 円に対する乖離率は ${Math.abs(divergenceRate)}%（${overUnder}）となっています。`;
    }
  } else {
    explanationText += `現在、価格データが蓄積されていません。`;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: sneaker.name,
    image: sneaker.image_url,
    brand: {
      '@type': 'Brand',
      name: sneaker.brand
    },
    model: sneaker.model,
    productID: sneaker.style_code,
    ...(currentLowest > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: currentLowest,
        priceCurrency: 'JPY',
        offerCount: histories?.[histories.length - 1]?.shop_count || 1
      }
    })
  };

  return (
    <div className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className={styles.contentArea}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '500px', background: 'var(--surface)', borderRadius: '12px', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <img 
              src={sneaker.image_url || 'https://via.placeholder.com/400?text=No+Image'} 
              alt={sneaker.name} 
              style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ flex: '2 1 400px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{sneaker.name}</h1>
            <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              {sneaker.brand} {sneaker.model} | 型番: {sneaker.style_code}
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', flex: 1, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>現在最安値</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>
                  {currentLowest > 0 ? `¥${currentLowest.toLocaleString()}` : '-'}
                </p>
                {isLowestUpdated && (
                  <span style={{ display: 'inline-block', background: '#34c759', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '4px' }}>
                    過去最安値更新中！
                  </span>
                )}
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', flex: 1, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>国内定価</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {sneaker.list_price ? `¥${sneaker.list_price.toLocaleString()}` : '不明'}
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', lineHeight: 1.6, marginBottom: '2rem', borderLeft: '4px solid var(--accent)' }}>
              <p>{explanationText}</p>
            </div>

            {currentLowest > 0 && (
              <a 
                href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(sneaker.style_code)}/?s=2`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.buyButton}
                style={{ display: 'block', width: '100%', padding: '1rem', background: '#bf0000', color: 'white', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: 'none' }}
              >
                楽天市場で最安値ショップを見る
              </a>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>過去90日間の最安値推移</h2>
          <PriceChart data={histories || []} />
        </div>
      </div>
    </div>
  );
}