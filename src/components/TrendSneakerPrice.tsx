'use client';

import { useState, useEffect } from 'react';

interface TrendSneakerPriceProps {
  styleCode: string;
  brand: string;
  model: string;
}

export default function TrendSneakerPrice({ styleCode, brand, model }: TrendSneakerPriceProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPrice = async () => {
      try {
        const params = new URLSearchParams({
          styleCode,
          brand,
          model,
        });
        const res = await fetch(`/api/price?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        if (isMounted) {
          setPrice(data.lowestPrice || null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching real-time price:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchPrice();
    return () => {
      isMounted = false;
    };
  }, [styleCode, brand, model]);

  if (loading) {
    return <span style={{ color: 'var(--foreground-muted)', fontSize: '0.9em' }}>取得中...</span>;
  }

  if (price === null) {
    return <span>-</span>;
  }

  return <span>¥{price.toLocaleString()}</span>;
}
