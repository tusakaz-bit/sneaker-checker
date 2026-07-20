"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/page.module.css";
import { SNEAKER_CATALOG, SIZES } from "@/app/data/sneakerCatalog";
import { slugify } from "@/lib/utils";

export default function HeroSearchBox() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (searchMode === "cascade") {
      if (!selectedBrand || !selectedModel) {
        alert("ブランドとモデルを選択してください。");
        return;
      }
      setLoading(true);
      const brandSlug = slugify(selectedBrand);
      const modelSlug = slugify(selectedModel);
      const params = new URLSearchParams();
      if (selectedColor !== "指定なし") params.set('color', selectedColor);
      params.set('size', selectedSize);
      
      router.push(`/sneakers/${brandSlug}/${modelSlug}?${params.toString()}`);
    } else {
      if (!freeTextModel.trim()) {
        alert("キーワードを入力してください。");
        return;
      }
      setLoading(true);
      const searchQuery = `${freeTextModel} ${freeTextSize}`.trim();
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
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
  );
}
