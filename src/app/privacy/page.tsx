import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Sneaker Checker',
};

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', lineHeight: '1.8' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>プライバシーポリシー</h1>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>1. アフィリエイトプログラムについて</h2>
        <p style={{ color: 'var(--foreground-muted)' }}>
          当サイトは、楽天グループ株式会社が提供する「楽天アフィリエイト」などのアフィリエイトプログラムに参加しています。
          当サイトのリンクを経由して商品を購入された場合、当サイトが紹介料を獲得することがあります。
          商品の購入に関するトラブル等につきましては、リンク先の店舗および楽天グループ株式会社までお問い合わせください。当サイトでは一切の責任を負いかねますので、ご了承ください。
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>2. アクセス解析ツールについて</h2>
        <p style={{ color: 'var(--foreground-muted)' }}>
          当サイトでは、品質向上のためにアクセス解析ツールを使用し、トラフィックデータの収集のためにCookie（クッキー）を使用しています。
          このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
          この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>3. 免責事項</h2>
        <p style={{ color: 'var(--foreground-muted)' }}>
          当サイトのコンテンツ・情報につきまして、可能な限り正確な情報を掲載するよう努めておりますが、誤情報が入り込んだり、情報が古くなっていることもございます。
          当サイトに掲載された内容によって生じた損害等の一切の責任を負いかねますのでご了承ください。
        </p>
      </section>

      <div style={{ marginTop: '4rem' }}>
        <Link href="/" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>トップページに戻る</Link>
      </div>
    </main>
  );
}
