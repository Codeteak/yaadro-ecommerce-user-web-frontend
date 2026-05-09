'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../utils/productImages';

/**
 * Next/Image with skeleton, lazy-friendly loading, and broken-URL fallback to placeholder.
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
}) {
  const [imgSrc, setImgSrc] = useState(() => src || PRODUCT_IMAGE_PLACEHOLDER);
  // `ready` controls whether we show the skeleton overlay.
  // We intentionally avoid re-showing the skeleton on background data refreshes
  // when an image was already rendered once (prevents "skeleton on top of data").
  const [ready, setReady] = useState(false);
  const hasEverLoadedRef = useRef(false);
  const prevSrcRef = useRef(null);

  useEffect(() => {
    const next = src || PRODUCT_IMAGE_PLACEHOLDER;
    const prev = prevSrcRef.current;
    prevSrcRef.current = next;

    setImgSrc(next);
    // Only show skeleton if we haven't successfully rendered any image yet.
    // If we already rendered once, keep the old "ready" state while the new image loads.
    if (!hasEverLoadedRef.current && next !== prev) {
      setReady(false);
    }
  }, [src]);

  const markReady = () => {
    hasEverLoadedRef.current = true;
    setReady(true);
  };

  return (
    <div className={fill ? 'relative w-full h-full' : 'relative'}>
      {!ready && (
        <div
          className={`absolute inset-0 z-[1] animate-pulse bg-gray-200 ${fill ? '' : 'rounded-[inherit]'}`}
          aria-hidden
        />
      )}
      {fill ? (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className={className}
          sizes={sizes}
          priority={priority}
          onLoad={markReady}
          onLoadingComplete={markReady}
          onError={() => {
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
          className={className}
          sizes={sizes}
          priority={priority}
          onLoad={markReady}
          onLoadingComplete={markReady}
          onError={() => {
            setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
            markReady();
          }}
        />
      )}
    </div>
  );
}
