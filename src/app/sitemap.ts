import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { SNEAKER_CATALOG } from '@/app/data/sneakerCatalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sneaker-checker.com';

  const routes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 } as const,
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 } as const,
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 } as const,
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 } as const,
  ];

  // 1. CatalogからすべてのブランドとモデルのURLを抽出
  const brands = new Set<string>();
  const models = new Set<string>();

  Object.entries(SNEAKER_CATALOG).forEach(([brand, modelMap]) => {
    brands.add(slugify(brand));
    Object.keys(modelMap).forEach((model) => {
      models.add(slugify(model));
    });
  });

  // 2. Supabaseからすべてのアイテム（style_code）を取得しつつ、DB上のブランド・モデルも補完
  const { data: sneakers } = await supabase.from('sneakers').select('*');
  
  const itemRoutes: any[] = [];
  
  if (sneakers) {
    sneakers.forEach((sneaker) => {
      brands.add(slugify(sneaker.brand));
      models.add(slugify(sneaker.model));
      
      itemRoutes.push({
        url: `${baseUrl}/item/${sneaker.style_code}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
    });
  }

  const brandRoutes = Array.from(brands).map((brand) => ({
    url: `${baseUrl}/brand/${brand}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  } as const));

  const modelRoutes = Array.from(models).map((model) => ({
    url: `${baseUrl}/model/${model}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  } as const));

  return [...routes, ...brandRoutes, ...modelRoutes, ...itemRoutes];
}
