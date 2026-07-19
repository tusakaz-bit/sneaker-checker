import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'お問い合わせ | Sneaker Checker',
};

export default function Contact() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', lineHeight: '1.8' }}>
      
      <div style={{
        background: 'var(--surface)',
        padding: '3rem',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            margin: '0 0 1rem 0',
            color: 'var(--foreground)'
          }}>お問い合わせ</h1>
          <div style={{ width: '100%', height: '1px', background: 'var(--border)' }}></div>
        </div>
        
        <div style={{ color: 'var(--foreground-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>
            当サイト（Sneaker Checker）へのお問い合わせ、ご意見、ご要望、広告掲載やタイアップに関するご相談は、専用のGoogleフォームよりお受けしております。
          </p>
          <p>
            以下のボタンをクリックすると、安全なお問い合わせ入力画面（Googleフォーム）が開きます。必要事項をご記入の上、送信してください。
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            color: '#FBBF24', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            margin: '0 0 1rem 0',
            fontSize: '1.1rem'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            お問い合わせ時の注意事項
          </h3>
          <ul style={{ 
            color: 'var(--foreground-muted)', 
            paddingLeft: '1.5rem',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <li>お送りいただいたお問い合わせには、通常2〜3営業日以内にご返信いたします。</li>
            <li>商品の購入、サイズ感、在庫確認、配送状況などについては、当サイトではお答えできません。リンク先の販売ショップ様へ直接お問い合わせをお願いいたします。</li>
          </ul>
        </div>

        <a 
          href="https://forms.gle/C9jM8MbTpSCuTgcj8" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(90deg, #4F46E5 0%, #3B82F6 100%)',
            color: '#ffffff',
            padding: '1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            transition: 'opacity 0.2s',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Googleフォームでお問い合わせを開く
        </a>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link href="/" style={{ color: 'var(--foreground-muted)', textDecoration: 'underline' }}>トップページに戻る</Link>
      </div>
    </main>
  );
}
