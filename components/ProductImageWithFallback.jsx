'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  PRODUCT_IMAGE_PLACEHOLDER,
  isProductImagePlaceholder,
} from '../utils/productImages';

/**
 * Next/Image with skeleton first paint, lazy-friendly loading, and broken-URL fallback.
 * Missing/broken images use `/images/default_product.jpg` with object-cover so the
 * padded default art fills the card/PDP well. Real photos: contain unless caller
 * passes `object-cover`.
 * `fill` avoids next/image absolute stretch (global `img { height: auto }` crops that).
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
  // Kept for call-site compatibility; custom SVG placeholders are no longer used.
  placeholderName: _placeholderName = '',
  placeholderCategory: _placeholderCategory = '',
}) {
  const resolveSrc = (raw) =>
    isProductImagePlaceholder(raw) ? PRODUCT_IMAGE_PLACEHOLDER : String(raw || '').trim();

  const [imgSrc, setImgSrc] = useState(() => resolveSrc(src));
  const [ready, setReady] = useState(false);
  const hasEverLoadedRef = useRef(false);
  const prevSrcRef = useRef(null);
  // Default art has baked-in whitespace — cover so it fills the well.
  // Real photos: contain unless the caller passes object-cover.
  const isPlaceholder = isProductImagePlaceholder(imgSrc);
  const fit = isPlaceholder
    ? 'cover'
    : /\bobject-cover\b/.test(className)
      ? 'cover'
      : 'contain';

  useEffect(() => {
    const next = resolveSrc(src);
    const prev = prevSrcRef.current;
    prevSrcRef.current = next;

    setImgSrc(next);
    if (!hasEverLoadedRef.current && next !== prev) {
      setReady(false);
    }
  }, [src]);

  const markReady = () => {
    hasEverLoadedRef.current = true;
    setReady(true);
  };

  const handleError = () => {
    if (isProductImagePlaceholder(imgSrc)) {
      markReady();
      return;
    }
    setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
    markReady();
  };

  return (
    <div
      data-fit={fill ? fit : undefined}
      className={
        fill
          ? `product-image-fill relative h-full min-h-0 min-w-0 w-full ${
              fit === 'contain'
                ? 'flex items-center justify-center'
                : ''
            }`
          : 'relative'
      }
    >
      {!ready ? (
        <div
          className={`absolute inset-0 z-[1] animate-pulse bg-gray-200 ${fill ? '' : 'rounded-[inherit]'}`}
          aria-hidden
        />
      ) : null}
      {imgSrc ? (
        fill ? (
          // Native img: next/image `fill` is position:absolute + 100% size and gets cropped
          // by overflow + global `img { height: auto }`.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={alt}
            className={`${className} ${ready ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            style={
              fit === 'cover'
                ? {
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }
                : {
                    position: 'static',
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                  }
            }
            onLoad={markReady}
            onError={handleError}
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
            onError={handleError}
          />
        )
      ) : null}
    </div>
  );
}
