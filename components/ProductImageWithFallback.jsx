'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PRODUCT_IMAGE_PLACEHOLDER } from '../utils/productImages';
import ProductPlaceholderGraphic from './ui/ProductPlaceholderGraphic';

/**
 * Next/Image with graphic/skeleton first paint, lazy-friendly loading, and broken-URL fallback.
 * `fill` avoids next/image absolute stretch (global `img { height: auto }` crops that).
 * `object-cover` in className keeps cover thumbs; otherwise the full photo is contained.
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
  const [ready, setReady] = useState(() => {
    const raw = src || '';
    return hasNamedGraphic && (!raw || raw === PRODUCT_IMAGE_PLACEHOLDER);
  });
  const hasEverLoadedRef = useRef(false);
  const prevSrcRef = useRef(null);
  const fit = /\bobject-cover\b/.test(className) ? 'cover' : 'contain';

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

  const handleError = () => {
    if (hasNamedGraphic) {
      setFailed(true);
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
