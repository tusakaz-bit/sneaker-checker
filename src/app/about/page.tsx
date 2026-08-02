import { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: '運営者情報 | Sneaker Checker',
  description: 'Sneaker Checker の運営者情報ページです。本業の生産管理の知見を活かし、スニーカーの適正価格をデータ分析でお届けします。',
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center', color: 'var(--foreground)' }}>運営者情報</h1>
      
      <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>
        
        {/* プロフィールヘッダーエリア */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#fff', flexShrink: 0 }}>
            👤
          </div>
          <div style={{ textAlign: 'center', flex: '1 1 300px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>まつお つかさ</h2>
            <p style={{ color: 'var(--foreground-muted)', fontWeight: 600 }}>メーカー生産管理職 / Sneaker-Checker 開発者</p>
          </div>
        </div>

        {/* コンセプトメッセージ */}
        <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--accent)', marginBottom: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic' }}>
            「欲しいスニーカーを、一番賢く、適正価格で手に入れるために。」
          </p>
        </div>

        {/* 本文テキストエリア */}
        <div style={{ lineHeight: 1.8, fontSize: '1rem', color: 'var(--foreground)' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            普段は製造業で、ゴム素材や製造工程などを扱う「生産管理」に従事しています。品質を維持しながら徹底的に無駄を省くモノづくりの現場にいるからこそ、スニーカーというプロダクトの背景にある技術や歴史への深いリスペクトを持っています。
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            一方で、人気スニーカーの価格は日々変動し、情報が乱立する中で「今、どこで買うのが一番適正なのか」が分かりにくいのが現状です。そこで、本業の生産管理で培ったデータ分析や業務効率化のノウハウ、そしてWeb開発の技術を活かし、このスニーカー価格比較システムを独自開発しました。
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            本サイトでは、楽天市場の膨大なデータの中から特定の型番（スタイルコード）に紐づく「現在の最安値」を自動で抽出し、リアルタイムで同期・更新しています。将来的には価格推移データの蓄積も行い、直感的に買い時がわかる仕組みも提供予定です。
          </p>
          <p>
            プレ値の変動に惑わされず、「賢く、失敗しないスニーカー選び」を楽しみたい皆様のお役に立てれば幸いです。
          </p>
        </div>

      </div>
    </main>
  );
}
