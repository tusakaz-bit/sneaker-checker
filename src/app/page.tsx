"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { SNEAKER_CATALOG, SIZES } from "./data/sneakerCatalog";
import { slugify, getRakutenDayInfo, getRandomViewerCount } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"search" | "timeline">("search");
  
  const [searchMode, setSearchMode] = useState<"cascade" | "free">("cascade");

  const brands = Object.keys(SNEAKER_CATALOG);
  const [selectedBrand, setSelectedBrand] = useState(brands[0]);
  const models = useMemo(() => Object.keys(SNEAKER_CATALOG[selectedBrand] || {}), [selectedBrand]);
  const [selectedModel, setSelectedModel] = useState("");
  
  const colors = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    return SNEAKER_CATALOG[selectedBrand]?.[selectedModel] || [];
  }, [selectedBrand, selectedModel]);
  const [selectedColor, setSelectedColor] = useState("指定なし");
  const [selectedSize, setSelectedSize] = useState("27.0cm");

  useEffect(() => {
    const newModels = Object.keys(SNEAKER_CATALOG[selectedBrand] || {});
    setSelectedModel(newModels[0] || "");
    setSelectedColor("指定なし");
  }, [selectedBrand]);

  useEffect(() => {
    setSelectedColor("指定なし");
  }, [selectedModel]);

  const [freeTextModel, setFreeTextModel] = useState("");
  const [freeTextSize, setFreeTextSize] = useState("27.0cm");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const rakutenDay = useMemo(() => getRakutenDayInfo(), []);

  const handleSearch = async () => {
    if (searchMode === "cascade") {
      if (!selectedBrand || !selectedModel) {
        alert("ブランドとモデルを選択してください。");
        return;
      }
      const brandSlug = slugify(selectedBrand);
      const modelSlug = slugify(selectedModel);
      const params = new URLSearchParams();
      if (selectedColor !== "指定なし") params.set('color', selectedColor);
      params.set('size', selectedSize);
      
      router.push(`/sneakers/${brandSlug}/${modelSlug}?${params.toString()}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let searchQuery = "";
      if (!freeTextModel.trim()) return;
      searchQuery = `${freeTextModel} ${freeTextSize} スニーカー`.trim().replace(/\s+/g, ' ');

      const keyword = encodeURIComponent(searchQuery);
      const res = await fetch(`/api/search?keyword=${keyword}&sort=%2BitemPrice`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP Error: ${res.status}`);
      }
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      const res = await fetch(`/api/timeline`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP Error: ${res.status}`);
      }
      setTimelineItems(data.items || []);
    } catch (err: any) {
      setTimelineError(err.message || "タイムラインの取得中にエラーが発生しました。");
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "timeline" && timelineItems.length === 0) {
      fetchTimeline();
    }
  }, [activeTab]);

  return (
    <main className={styles.main}>
      {/* ヒーローセクション */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>プレ値・入手困難スニーカーの最安値比較</h1>
          <p className={styles.heroSubtitle}>
            リアルタイムで在庫と最安値をチェック。安心できる優良ショップだけを厳選。
          </p>

          <div className={styles.searchBox}>
            <div className={styles.modeToggle}>
              <button 
                className={`${styles.modeButton} ${searchMode === "cascade" ? styles.activeMode : ""}`}
                onClick={() => setSearchMode("cascade")}
              >
                ブランドから探す
              </button>
              <button 
                className={`${styles.modeButton} ${searchMode === "free" ? styles.activeMode : ""}`}
                onClick={() => setSearchMode("free")}
              >
                自由に検索
              </button>
            </div>

            {searchMode === "cascade" ? (
              <div className={styles.cascadeGrid}>
                <div className={styles.filterGroup}>
                  <label className={styles.label}>ブランド</label>
                  <select className={styles.select} value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.label}>モデル</label>
                  <select className={styles.select} value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.label}>カラー</label>
                  <select className={styles.select} value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                    <option value="指定なし">指定なし</option>
                    {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.label}>サイズ</label>
                  <select className={styles.select} value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className={styles.cascadeGrid}>
                <div className={styles.filterGroup} style={{ gridColumn: "span 3" }}>
                  <label className={styles.label}>検索</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={freeTextModel}
                    onChange={(e) => setFreeTextModel(e.target.value)}
                    placeholder="例: Jordan 1 Retro High Chicago"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.label}>サイズ</label>
                  <select
                    className={styles.select}
                    value={freeTextSize}
                    onChange={(e) => setFreeTextSize(e.target.value)}
                  >
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button className={styles.searchButton} onClick={handleSearch} disabled={loading}>
              {loading ? "検索中..." : "最安値を検索"}
            </button>
          </div>
        </div>
      </section>

      {/* コンテンツエリア */}
      <div className={styles.contentArea}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "search" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("search")}
          >
            最安値検索
          </button>
          <button
            className={`${styles.tab} ${activeTab === "timeline" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            トレンド新着・再入荷
          </button>
        </div>

        {activeTab === "search" ? (
          <>
            {(rakutenDay.isToday || rakutenDay.isTomorrow) && (
              <div className={styles.saleBanner}>
                {rakutenDay.isToday ? '🔥 本日は「0と5のつく日」！楽天ポイント5倍デー！ 🔥' : '🔔 明日は「0と5のつく日」！楽天ポイント5倍デー！ 🔔'}
              </div>
            )}

            {searchMode === "free" && (
              loading ? (
                <div className={styles.loading}>スニーカーを探しています...</div>
              ) : error ? (
                <div className={styles.noticeBoard}>
                  <p className={styles.noticeText}>❌ {error}</p>
                </div>
              ) : items.length > 0 ? (
                <div className={styles.grid}>
                  {items.map((item) => (
                    <a href={item.affiliateUrl || item.itemUrl} target="_blank" rel="noopener noreferrer" key={item.itemCode} className={styles.card}>
                      <div className={styles.badgeContainer}>
                        {item.pointRate > 1 && (
                          <div className={styles.pointBadge}>Pt {item.pointRate}x</div>
                        )}
                        {item.reviewCount >= 5 && item.reviewAverage >= 4.0 && (
                          <div className={styles.popularBadge}>🔥 大人気</div>
                        )}
                      </div>
                      <div className={styles.imageContainer}>
                        {item.mediumImageUrls && item.mediumImageUrls.length > 0 ? (
                          <img
                            src={item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '?_ex=400x400')}
                            alt={item.itemName}
                            className={styles.image}
                          />
                        ) : (
                          <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa" }}>No Image</div>
                        )}
                      </div>
                      <div className={styles.cardContent}>
                        <p className={styles.shopName}>{item.shopName}</p>
                        <h3 className={styles.itemName}>{item.itemName}</h3>
                        <div className={styles.priceRow}>
                          <span className={styles.priceLabel}>最安値</span>
                          <span className={styles.price}>
                            &yen;{item.itemPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : !loading && (
                 <p className={styles.noticeText}>条件に合うスニーカーが見つかりませんでした。別のキーワードをお試しください。</p>
              )
            )}

            <section className={styles.seoLinksSection} style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', textAlign: 'left', fontWeight: 'bold' }}>人気のブランド・モデル一覧</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {Object.keys(SNEAKER_CATALOG).map(b => (
                  <div key={b}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--foreground)', fontWeight: 'bold' }}>{b}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {Object.keys(SNEAKER_CATALOG[b]).map(m => (
                        <li key={m} style={{ marginBottom: '0.5rem' }}>
                          <Link href={`/sneakers/${slugify(b)}/${slugify(m)}`} style={{ color: 'var(--foreground-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                            {m}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className={styles.timelineHeader}>
              <p className={styles.subtitle} style={{ margin: 0, textAlign: "left" }}>
                人気モデルの最新入荷・更新情報を表示しています
              </p>
              <button className={styles.refreshButton} onClick={fetchTimeline} disabled={timelineLoading}>
                {timelineLoading ? "更新中..." : "🔄 最新を読み込む"}
              </button>
            </div>

            {timelineLoading ? (
              <div className={styles.loading}>新着情報を取得中...</div>
            ) : timelineError ? (
              <div className={styles.noticeBoard}>
                <p className={styles.noticeText}>❌ {timelineError}</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {timelineItems.map((item, idx) => (
                  <a href={item.affiliateUrl || item.itemUrl} target="_blank" rel="noopener noreferrer" key={`${item.itemCode}-${idx}`} className={styles.card}>
                    <div className={styles.badgeContainer}>
                      <div className={styles.newBadge}>NEW</div>
                      {item.searchKeyword && (
                        <div className={styles.keywordBadge}>{item.searchKeyword}</div>
                      )}
                    </div>
                    <div className={styles.imageContainer}>
                      {item.mediumImageUrls && item.mediumImageUrls.length > 0 ? (
                        <img
                          src={item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '?_ex=400x400')}
                          alt={item.itemName}
                          className={styles.image}
                        />
                      ) : (
                        <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa" }}>No Image</div>
                      )}
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.viewingCount}>
                        <div className={styles.liveDot}></div>
                        現在{getRandomViewerCount(item.itemCode)}人が閲覧中
                      </div>
                      <p className={styles.shopName}>{item.shopName}</p>
                      <h3 className={styles.itemName}>{item.itemName}</h3>
                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>最安値</span>
                        <span className={styles.price}>
                          &yen;{item.itemPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
                {timelineItems.length === 0 && !timelineLoading && (
                  <p className={styles.noticeText}>新着情報が見つかりませんでした。</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
