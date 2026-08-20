import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import seoOverrides from '@/data/seo_overrides.json';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: (seoOverrides as any)["/"]?.title || 'Sneaker Checker',
  description: (seoOverrides as any)["/"]?.description || 'スニーカーの価格と在庫をリアルタイム比較',
  keywords: (seoOverrides as any)["/"]?.keywords || ['スニーカー', '価格比較', '最安値'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>

      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-LX34HQ99HJ" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LX34HQ99HJ');
          `
        }} />
      </head>

      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.05em' }}>
            <a href="/" style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
              SNEAKER<span style={{ color: 'var(--accent)' }}>CHECKER</span>
            </a>
          </div>
          <nav>
            <a href="/" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>トップへ</a>
          </nav>
        </header>
        <div style={{ width: '100%', padding: '0.4rem 1rem', background: 'var(--background)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--foreground-muted)', textAlign: 'center' }}>
          ※当サイトはアフィリエイト広告（楽天アフィリエイト等）を利用しています。
        </div>
        
        {children}
        <footer style={{ width: '100%', padding: '3rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', background: 'var(--surface)', marginTop: 'auto' }}>
          {/* 楽天ウェブサービス クレジット表記 (必須) */}
          <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.8, transition: 'opacity 0.2s' }} >
            <img src="https://webservice.rakuten.co.jp/img/credit/200709/credit_22121.gif" style={{ border: 0 }} alt="Rakuten Web Service Center" title="Rakuten Web Service Center" width="221" height="21" />
          </a>
          
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
            <a href="/about" style={{ color: 'var(--foreground-muted)', textDecoration: 'none' }}>運営者情報</a>
            <a href="/privacy" style={{ color: 'var(--foreground-muted)', textDecoration: 'none' }}>プライバシーポリシー</a>
            <a href="/contact" style={{ color: 'var(--foreground-muted)', textDecoration: 'none' }}>お問い合わせ</a>
          </div>

          
          <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', textAlign: 'center', maxWidth: '800px', lineHeight: '1.5' }}>
            ※当サイトに表示されている価格や在庫状況は、データ取得時のものです。<br />
            常に変動しているため、最新の価格・在庫状況・商品詳細については、必ずリンク先の各ショップにてご確認ください。
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
            &copy; {new Date().getFullYear()} SNEAKER CHECKER. All rights reserved.
          </p>
        </footer>

      </body>
    </html>
  );
}


