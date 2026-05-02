'use client';

import { useEffect, useState } from 'react';
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setImgSrc(src || PRODUCT_IMAGE_PLACEHOLDER);
    setReady(false);
  }, [src]);

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
          onLoad={() => setReady(true)}
          onLoadingComplete={() => setReady(true)}
          onError={() => {
            setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
            setReady(true);
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
          onLoad={() => setReady(true)}
          onLoadingComplete={() => setReady(true)}
          onError={() => {
            setImgSrc(PRODUCT_IMAGE_PLACEHOLDER);
            setReady(true);
          }}
        />
      )}
    </div>
  );
}
