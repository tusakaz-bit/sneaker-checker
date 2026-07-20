const fs = require('fs');
const file = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\cc154b9d-cc3f-4c7b-9486-892c8642a017\\sneaker-checker\\src\\app\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the Rakuten timeline logic with Supabase query
const importReplacement = `import { supabase } from "@/lib/supabase";\nimport HeroSearchBox from "@/components/HeroSearchBox";`;
content = content.replace(/import \{ getTimelineItems \} from "@\/lib\/rakuten";\r?\nimport HeroSearchBox from "@\/components\/HeroSearchBox";/, importReplacement);

const ssrReplacement = `
  // 完全SSR: サーバー側でタイムライン（人気商品）をデータベースから取得
  const { data: dbItems } = await supabase
    .from('sneakers')
    .select('*, price_histories(*)')
    .limit(10);
    
  const timelineItems = (dbItems || []).map((snk: any) => {
    let currentLowest = 0;
    if (snk.price_histories && snk.price_histories.length > 0) {
      const sorted = snk.price_histories.sort((a: any, b: any) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      currentLowest = sorted[0].lowest_price;
    }
    return { ...snk, currentLowest };
  });
`;
content = content.replace(/const timelineItems = await getTimelineItems\(\);/, ssrReplacement);

const renderReplacement = `
        {timelineItems.length > 0 ? (
          <div className={styles.grid}>
            {timelineItems.map((item: any, idx: number) => (
              <Link href={\`/item/\${item.style_code}\`} key={\`\${item.style_code}-\${idx}\`} className={styles.card}>
                <div className={styles.badgeContainer}>
                  <div className={styles.newBadge}>NEW</div>
                  {item.currentLowest > 0 && item.list_price && item.currentLowest < item.list_price && (
                    <div className={styles.popularBadge} style={{ background: '#34c759' }}>定価割れ</div>
                  )}
                </div>
                <div className={styles.imageContainer}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa" }}>No Image</div>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.shopName}>{item.brand} {item.model}</p>
                  <h3 className={styles.itemName} style={{ minHeight: '2.6em' }}>{item.name}</h3>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>最安値</span>
                    <span className={styles.price}>
                      {item.currentLowest > 0 ? \`¥\${item.currentLowest.toLocaleString()}\` : '-'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
`;
const oldRenderRegex = /\{timelineItems\.length > 0 \? \([\s\S]*?(?=\) : \(\s*<p className=\{styles\.noticeText\}>)/;
content = content.replace(oldRenderRegex, renderReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated home page to use DB");
