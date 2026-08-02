import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // 1時間に1回キャッシュを更新

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sneaker-checker.com';

  // 基本的な静的ページ
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    } as const,
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    } as const,
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    } as const,
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    } as const,
  ];

  // Supabaseからすべてのスニーカーを取得
  const { data: sneakers } = await supabase.from('sneakers').select('*');
  
  if (!sneakers) {
    return routes;
  }

  // ユニークなブランドとモデルを抽出
  const brands = new Set<string>();
  const models = new Set<string>();

  sneakers.forEach((sneaker) => {
    const brandSlug = sneaker.brand.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = sneaker.model.toLowerCase().replace(/\s+/g, '-');
    
    brands.add(brandSlug);
    models.add(modelSlug);
  });

  // ブランド一覧ページ
  const brandRoutes = Array.from(brands).map((brand) => ({
    url: `${baseUrl}/brand/${brand}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  } as const));

  // モデル一覧ページ
  const modelRoutes = Array.from(models).map((model) => ({
    url: `${baseUrl}/model/${model}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  } as const));

  // 各アイテム（商品詳細）ページ
  const itemRoutes = sneakers.map((sneaker) => ({
    url: `${baseUrl}/item/${sneaker.style_code}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  } as const));

  return [...routes, ...brandRoutes, ...modelRoutes, ...itemRoutes];
}
