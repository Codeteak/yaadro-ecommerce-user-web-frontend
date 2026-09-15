'use client';

import { useState } from 'react';
import Image from 'next/image';
import { mediaObjectToUrl } from '../utils/mediaUrl';
import { CATEGORY_DUMMY_IMAGE, getCategoryImageUrl } from '../utils/categoryImage';

export function isImageUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
}

/**
 * True when the category tile should show a photo (URL icon or category image), not emoji / placeholder.
 */
export function categoryShowsPhoto(category) {
  if (typeof category !== 'object' || !category) return false;
  const { icon, image } = category;
  const resolved = typeof image === 'string' ? image : mediaObjectToUrl(image);
  if (icon && isImageUrl(icon)) return true;
  if (icon) return false;
  if (image && isImageUrl(image)) return true;
  if (resolved && isImageUrl(resolved)) return true;
  return false;
}

function CategoryPhoto({ src, name, photoWrap, imageSizes }) {
  const [failed, setFailed] = useState(false);
  const showSrc = !failed && src ? src : CATEGORY_DUMMY_IMAGE;
  const isDummy = showSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <span className={photoWrap}>
      <Image
        src={showSrc}
        alt={name}
        fill
        className={
          isDummy
            ? 'object-contain object-center p-1.5'
            : 'object-contain object-center p-0.5'
        }
        sizes={imageSizes}
        onError={() => setFailed(true)}
        unoptimized
      />
    </span>
  );
}

/**
 * Renders category icon for navbar/cards.
 * Priority: 1) Icon (emoji, text, or image URL), 2) Category image only if no icon.
 * Missing/broken photos use the default category/product image.
 * @param {boolean} [frameless] — no gray plate behind photos; fill parent (use with sized wrapper).
 */
export default function CategoryIcon({ category, className = '', size = 'md', frameless = false }) {
  const name = typeof category === 'object' ? category?.name : 'Category';
  const icon = typeof category === 'object' ? category?.icon : null;
  const imageUrl = getCategoryImageUrl(typeof category === 'object' ? category : null);

  const sizeClasses = {
    xs: 'w-6 h-6 text-base',
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };
  const s = frameless ? 'relative h-full w-full min-h-0 min-w-0' : sizeClasses[size] || sizeClasses.md;

  const photoWrap = frameless
    ? `relative inline-flex h-full w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl ${className}`
    : `relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ${s} ${className}`;

  const imageSizes = frameless ? '(max-width: 768px) 96px, 112px' : '48px';

  if (icon && isImageUrl(icon)) {
    return (
      <CategoryPhoto src={icon} name={name} photoWrap={photoWrap} imageSizes={imageSizes} />
    );
  }

  if (icon) {
    return (
      <span
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 ${s} ${className}`}
        aria-hidden
      >
        {icon}
      </span>
    );
  }

  return (
    <CategoryPhoto
      src={imageUrl}
      name={name}
      photoWrap={photoWrap}
      imageSizes={imageSizes}
    />
  );
}
