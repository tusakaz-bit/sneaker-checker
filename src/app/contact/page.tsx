import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'お問い合わせ | Sneaker Checker',
};

export default function Contact() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', lineHeight: '1.8' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>お問い合わせ</h1>
      
      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>
          当サイトに関するご質問、ご要望、不具合のご報告などは、以下のメールアドレスまでお気軽にご連絡ください。
        </p>
        
        <div style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          <a href="mailto:contact@example.com" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>
            contact@example.com
          </a>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
          ※ 個別の商品（サイズ感、在庫状況、配送状況など）に関するお問い合わせは、リンク先の販売ショップ様へ直接お願いいたします。<br/>
          ※ ご返信まで数日お時間をいただく場合がございます。あらかじめご了承ください。
        </p>
      </div>

      <div style={{ marginTop: '4rem' }}>
        <Link href="/" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>トップページに戻る</Link>
      </div>
    </main>
  );
}
