import { getRakutenSearchQuery } from '@/lib/searchQuery';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PriceChart from '@/components/PriceChart';
import styles from '@/app/page.module.css';
import SneakerImage from '@/components/SneakerImage';
import sneakerContent from '@/data/sneakerContent.json';
import Breadcrumbs from '@/components/Breadcrumbs';
import { slugify } from '@/lib/utils';

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
    description: (() => {
      const c = (sneakerContent as any)[sneaker.style_code];
      const base = `${sneaker.brand} ${sneaker.model} ${sneaker.name} (${sneaker.style_code}) の最安値・価格推移グラフを掲載。`;
      const hist = c ? c.history.substring(0, 60) + '…' : '';
      return base + hist;
    })(),
    alternates: {
      canonical: `/item/${styleCode}`,
    },
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
  let currentHighest = 0;
  let averagePrice = 0;
  let isLowestUpdated = false;
  let divergenceRate = null;

  if (histories && histories.length > 0) {
    const latest = histories[histories.length - 1];
    currentLowest = latest.lowest_price;
    currentHighest = latest.highest_price || currentLowest;

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
    explanationText += `現在の最安値は ¥${currentLowest.toLocaleString()} です。`;
    if (averagePrice > 0) {
      const diff = Math.abs(currentLowest - averagePrice);
      const diffPercent = Math.round((diff / averagePrice) * 100);
      const highLow = currentLowest > averagePrice ? '高い' : '安い';
      explanationText += `過去の平均価格（¥${averagePrice.toLocaleString()}）と比較して約 ${diffPercent}% ${highLow}価格帯で推移しています。`;
    }
    if (divergenceRate !== null && sneaker.list_price) {
      const overUnder = divergenceRate > 0 ? 'プレ値' : 'お買い得';
      explanationText += `国内定価 ¥${sneaker.list_price.toLocaleString()} に対する乖離率は ${Math.abs(divergenceRate)}%（${overUnder}）となっています。`;
    }
  } else {
    explanationText += `現在、価格データをリアルタイムで同期・更新中です。楽天市場で最新在庫や価格情報を確認できます。`;
  }

  const contentData = (sneakerContent as any)[sneaker.style_code];
  const productDescription = contentData && contentData.history
    ? contentData.history.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'
    : `${sneaker.brand} ${sneaker.model} ${sneaker.name} (${sneaker.style_code}) の最安値・価格推移データを掲載しています。`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: sneaker.name,
    image: sneaker.image_url,
    description: productDescription,
    brand: {
      '@type': 'Brand',
      name: sneaker.brand
    },
    model: sneaker.model,
    productID: sneaker.style_code,
    offers: currentLowest > 0 
      ? (currentHighest > currentLowest 
        ? {
            '@type': 'AggregateOffer',
            lowPrice: currentLowest,
            highPrice: currentHighest,
            priceCurrency: 'JPY',
            offerCount: histories?.[histories.length - 1]?.shop_count || 1,
            availability: 'https://schema.org/InStock'
          }
        : {
            '@type': 'Offer',
            price: currentLowest,
            priceCurrency: 'JPY',
            availability: 'https://schema.org/InStock'
          })
      : {
          '@type': 'Offer',
          price: 0,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/OutOfStock'
        }
  };

  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '';
  const buyUrl = affiliateId
    ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(getRakutenSearchQuery(sneaker))}/558885/?s=2&min=3000`)}`
    : `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(getRakutenSearchQuery(sneaker))}/558885/?s=2&min=3000`;

  return (
    <div className={styles.main}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      
      <div className={styles.contentArea}>
        <Breadcrumbs items={[
          { label: 'トップ', href: '/' },
          { label: sneaker.brand, href: '/brand/' + slugify(sneaker.brand) },
          { label: sneaker.model, href: '/model/' + slugify(sneaker.model) },
          { label: sneaker.name, href: '/item/' + sneaker.style_code }
        ]} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ flex: '1 1 300px', maxWidth: '500px', background: 'var(--surface)', borderRadius: '12px', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <SneakerImage src={sneaker.image_url} alt={sneaker.name} styleCode={sneaker.style_code} model={sneaker.model} style={{width: '100%', height: 'auto', objectFit: 'contain' }} />
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

            <a 
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={styles.buyButton}
              style={{ display: 'block', width: '100%', padding: '1rem', background: '#bf0000', color: 'white', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: 'none' }}
            >
              楽天市場で最安値ショップを見る
            </a>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>過去90日間の最安値推移</h2>
          <PriceChart data={histories || []} />
        </div>

        {/* 解説テキストセクション */}
        {(() => {
          const content = (sneakerContent as any)[sneaker.style_code];
          if (!content) return null;
          return (
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📏</span> サイズ感
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{content.size_guide}</p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📖</span> モデルの歴史
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{content.history}</p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👗</span> スタイリング
                </h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--foreground-muted)' }}>{content.styling}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

