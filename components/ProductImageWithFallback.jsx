'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../utils/productImages';
import ProductPlaceholderGraphic from './ui/ProductPlaceholderGraphic';

/**
 * Next/Image with graphic/skeleton first paint, lazy-friendly loading, and broken-URL fallback.
 */
export default function ProductImageWithFallback({
  src,
  alt,
  className = '',
  sizes,
  fill = false,
  width,
  height,
  priority = false,
  placeholderName = '',
  placeholderCategory = '',
}) {
  const hasNamedGraphic = Boolean(String(placeholderName || '').trim());
  const [imgSrc, setImgSrc] = useState(() => {
    const raw = src || '';
    if (!raw || raw === PRODUCT_IMAGE_PLACEHOLDER) {
      return hasNamedGraphic ? null : PRODUCT_IMAGE_PLACEHOLDER;
    }
    return raw;
  });
  const [failed, setFailed] = useState(false);
  // `ready` controls whether we show the skeleton/graphic overlay.
  // We intentionally avoid re-showing the skeleton on background data refreshes
  // when an image was already rendered once (prevents "skeleton on top of data").
  const [ready, setReady] = useState(() => {
    const raw = src || '';
    return hasNamedGraphic && (!raw || raw === PRODUCT_IMAGE_PLACEHOLDER);
  });
  const hasEverLoadedRef = useRef(false);
  const prevSrcRef = useRef(null);

  useEffect(() => {
    const raw = src || '';
    const isDummy = !raw || raw === PRODUCT_IMAGE_PLACEHOLDER;
    const next = isDummy
      ? hasNamedGraphic
        ? null
        : PRODUCT_IMAGE_PLACEHOLDER
      : raw;
    const prev = prevSrcRef.current;
    prevSrcRef.current = next;

    setImgSrc(next);
    setFailed(false);
    if (!hasEverLoadedRef.current && next !== prev) {
      setReady(false);
    }
    // Named graphic with no real image — treat as ready (graphic is the display).
    if (hasNamedGraphic && !next) {
      markReady();
    }
  }, [src, hasNamedGraphic]);

  const markReady = () => {
    hasEverLoadedRef.current = true;
    setReady(true);
  };

  const showGraphic = hasNamedGraphic && (!ready || failed || !imgSrc);
  const showPulse = !hasNamedGraphic && !ready;

  return (
    <div className={fill ? 'relative w-full h-full' : 'relative'}>
      {showGraphic ? (
        <div className={`absolute inset-0 z-[1] ${fill ? '' : 'rounded-[inherit] overflow-hidden'}`}>
          <ProductPlaceholderGraphic
            name={placeholderName}
            categoryName={placeholderCategory}
          />
        </div>
      ) : null}
      {showPulse ? (
        <div
          className={`absolute inset-0 z-[1] animate-pulse bg-gray-200 ${fill ? '' : 'rounded-[inherit]'}`}
          aria-hidden
        />
      ) : null}
      {imgSrc && !failed ? (
        fill ? (
          <Image
            src={imgSrc}
            alt={alt}
            fill
            className={`${className} ${ready ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            sizes={sizes}
            priority={priority}
            onLoad={markReady}
            onLoadingComplete={markReady}
            onError={() => {
              if (hasNamedGraphic) {
                setFailed(true);
                markReady();
                return;
              }
              setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
              markReady();
            }}
          />
        ) : (
          <Image
            src={imgSrc}
            alt={alt}
            width={width}
            height={height}
            className={`${className} ${ready ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            sizes={sizes}
            priority={priority}
            onLoad={markReady}
            onLoadingComplete={markReady}
            onError={() => {
              if (hasNamedGraphic) {
                setFailed(true);
                markReady();
                return;
              }
              setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
              markReady();
            }}
          />
        )
      ) : null}
    </div>
  );
}
