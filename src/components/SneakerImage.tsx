"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SneakerImageProps {
  src?: string;
  alt: string;
  styleCode: string;
  model: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function SneakerImage({ alt, styleCode, model, style, className }: SneakerImageProps) {
  const getTargetUrl = (code: string) => `https://alnmehxuxisbualgplxs.supabase.co/storage/v1/object/public/sneaker-images/${code}.webp?v=1`;
  
  const [imgSrc, setImgSrc] = useState(getTargetUrl(styleCode));

  useEffect(() => {
    if (styleCode) {
      setImgSrc(getTargetUrl(styleCode));
    }
  }, [styleCode]);

  const handleError = () => {
    // 最終フォールバック
    setImgSrc(`https://placehold.co/500x500/eeeeee/333333.png?text=${encodeURIComponent(model || styleCode)}`);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '200px', ...style }} className={className}>
      <Image 
        src={imgSrc} 
        alt={alt} 
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        style={{ objectFit: 'contain' }}
        onError={handleError} 
      />
    </div>
  );
}
