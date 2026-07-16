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
  
  // 検索モード (カスケード vs 自由入力)
  const [searchMode, setSearchMode] = useState<"cascade" | "free">("cascade");

  // --- カスケード検索用のステート ---
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

  // ブランドが変わったらモデルとカラーをリセット
  useEffect(() => {
    const newModels = Object.keys(SNEAKER_CATALOG[selectedBrand] || {});
    setSelectedModel(newModels[0] || "");
    setSelectedColor("指定なし");
  }, [selectedBrand]);

  // モデルが変わったらカラーをリセット
  useEffect(() => {
    setSelectedColor("指定なし");
  }, [selectedModel]);

  // --- 自由入力検索用のステート ---
  const [freeTextModel, setFreeTextModel] = useState("On Cloud 5");
  const [freeTextSize, setFreeTextSize] = useState("27.0cm");

  // --- 共通の検索結果ステート ---
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // タイムライン用のステート
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const rakutenDay = useMemo(() => getRakutenDayInfo(), []);

  // 指定アイテムの検索
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
      
      // 動的ルートへ遷移する (SEO強化)
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

  // タイムラインの取得
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // レビューの星をレンダリングする関数
  const renderStars = (average: number) => {
    const fullStars = Math.floor(average);
    const hasHalfStar = average % 1 >= 0.5;
    let stars = "";
    for (let i = 0; i < fullStars; i++) stars += "★";
    if (hasHalfStar) stars += "☆";
    while (stars.length < 5) stars += "☆";
    return stars;
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Sneaker Checker</h1>
      <p className={styles.subtitle}>
        プレ値・入手困難スニーカーの在庫・最安値をリアルタイム比較
      </p>

      {/* タブ切り替え */}
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
          {/* 検索タブ */}
          <section className={styles.searchSection}>
            <div className={styles.modeToggle}>
              <button 
                className={`${styles.modeButton} ${searchMode === "cascade" ? styles.activeMode : ""}`}
                onClick={() => setSearchMode("cascade")}
              >
                リストから選ぶ
              </button>
              <button 
                className={`${styles.modeButton} ${searchMode === "free" ? styles.activeMode : ""}`}
                onClick={() => setSearchMode("free")}
              >
                自由にテキスト入力
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
                  <label className={styles.label}>ブランド・モデル名など自由に</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={freeTextModel}
                    onChange={(e) => setFreeTextModel(e.target.value)}
                    placeholder="例: On Cloud 5, HOKA Clifton 9"
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
          </section>

          {(rakutenDay.isToday || rakutenDay.isTomorrow) && (
            <div className={styles.saleBanner}>
              {rakutenDay.isToday ? '🔥 本日は「0と5のつく日」！楽天ポイント5倍デー！ 🔥' : '🔔 明日は「0と5のつく日」！楽天ポイント5倍デー！ 🔔'}
            </div>
          )}

          <div className={styles.noticeBoard}>
            <p className={styles.noticeText}>
              ⚠️ 検索精度を高めるため、8,000円以下の安すぎる小物（靴紐等）は自動的に除外しています。
            </p>
          </div>

          {/* 自由入力検索の結果表示エリア */}
          {searchMode === "free" && (
            loading ? (
              <div className={styles.loading}>スニーカーを探しています...</div>
            ) : error ? (
              <div className={styles.noticeBoard} style={{ borderLeftColor: "var(--accent)" }}>
                <p className={styles.noticeText}>❌ {error}</p>
              </div>
            ) : (
              <>
                {items.length > 0 && (
                  <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
                    {items.length}件の優良在庫が見つかりました（安い順）
                  </p>
                )}
                <div className={styles.grid}>
                  {items.map((item) => (
                                        <div key={item.itemCode} className={styles.card}>
                      <div className={styles.badgeContainer}>
                        {item.pointRate > 1 && (
                          <div className={styles.pointBadge}>✨ ポイント{item.pointRate}倍</div>
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
                          <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:"0.875rem" }}>No Image</div>
                        )}
                      </div>
                                        <div className={styles.cardContent}>
                    <div className={styles.viewingCount}>
                      <div className={styles.liveDot}></div>
                      🔥 現在{getRandomViewerCount(item.itemCode)}人が閲覧中
                    </div>
                    <h3 className={styles.itemName}>{item.itemName}</h3>
                        <div className={styles.shopInfo}>
                          <p className={styles.shopName}>{item.shopName}</p>
                          {item.shopOfTheYearFlag === 1 && (
                            <span className={styles.shopOfTheYear}>👑 優良ショップ</span>
                          )}
                        </div>
                        
                        {item.reviewCount > 0 && (
                          <div className={styles.reviewData}>
                            <span className={styles.stars}>{renderStars(item.reviewAverage)}</span>
                            <span className={styles.reviewCount}>({item.reviewCount}件)</span>
                          </div>
                        )}

                        <div className={styles.priceRow}>
                          <span className={styles.price}>
                            &yen;{item.itemPrice.toLocaleString()}
                          </span>
                          {item.postageFlag === 0 && (
                            <span className={styles.postageFree}>送料無料</span>
                          )}
                          {item.postageFlag === 1 && (
                            <span className={styles.postage}>送料別</span>
                          )}
                        </div>
                        <a
                          href={item.affiliateUrl || item.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.buyButton}
                        >
                          ショップへ行く →
                        </a>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && !loading && (
                    <p className={styles.noticeText}>条件に合うスニーカーが見つかりませんでした。別のキーワードをお試しください。</p>
                  )}
                </div>
              </>
            )
          )}

          {/* SEO内部リンク群（人気スニーカー一覧） */}
          <section className={styles.seoLinksSection} style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border)' }}>
            <h2 className={styles.title} style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'left' }}>人気のブランド・モデル一覧</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.keys(SNEAKER_CATALOG).map(b => (
                <div key={b}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>{b}</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Object.keys(SNEAKER_CATALOG[b]).map(m => (
                      <li key={m} style={{ marginBottom: '0.25rem' }}>
                        <Link href={`/sneakers/${slugify(b)}/${slugify(m)}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' }}>
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
          {/* タイムラインタブ */}
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
            <div className={styles.noticeBoard} style={{ borderLeftColor: "var(--accent)" }}>
              <p className={styles.noticeText}>❌ {timelineError}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {timelineItems.map((item, idx) => (
                                <div key={`${item.itemCode}-${idx}`} className={styles.card}>
                  <div className={styles.badgeContainer}>
                    {item.pointRate > 1 && (
                      <div className={styles.pointBadge}>✨ ポイント{item.pointRate}倍</div>
                    )}
                  </div>
                  <div className={styles.newBadge}>NEW</div>
                  {item.searchKeyword && (
                    <div className={styles.keywordBadge}>{item.searchKeyword}</div>
                  )}
                  <div className={styles.imageContainer}>
                    {item.mediumImageUrls && item.mediumImageUrls.length > 0 ? (
                      <img
                        src={item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '?_ex=400x400')}
                        alt={item.itemName}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.image} style={{ display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:"0.875rem" }}>No Image</div>
                    )}
                  </div>
                                    <div className={styles.cardContent}>
                    <div className={styles.viewingCount}>
                      <div className={styles.liveDot}></div>
                      🔥 現在{getRandomViewerCount(item.itemCode)}人が閲覧中
                    </div>
                    <h3 className={styles.itemName}>{item.itemName}</h3>
                    <div className={styles.shopInfo}>
                      <p className={styles.shopName}>{item.shopName}</p>
                      {item.shopOfTheYearFlag === 1 && (
                        <span className={styles.shopOfTheYear}>👑 優良ショップ</span>
                      )}
                    </div>

                    {item.reviewCount > 0 && (
                      <div className={styles.reviewData}>
                        <span className={styles.stars}>{renderStars(item.reviewAverage)}</span>
                        <span className={styles.reviewCount}>({item.reviewCount}件)</span>
                      </div>
                    )}

                    <div className={styles.priceRow}>
                      <span className={styles.price}>
                        &yen;{item.itemPrice.toLocaleString()}
                      </span>
                      {item.postageFlag === 0 && (
                        <span className={styles.postageFree}>送料無料</span>
                      )}
                      {item.postageFlag === 1 && (
                        <span className={styles.postage}>送料別</span>
                      )}
                    </div>
                    <a
                      href={item.affiliateUrl || item.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.buyButton}
                    >
                      ショップへ行く →
                    </a>
                  </div>
                </div>
              ))}
              {timelineItems.length === 0 && !timelineLoading && (
                <p className={styles.noticeText}>新着情報が見つかりませんでした。</p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}