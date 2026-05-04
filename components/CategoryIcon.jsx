'use client';

import Image from 'next/image';
import { mediaObjectToUrl } from '../utils/mediaUrl';

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

/**
 * Renders category icon for navbar/cards.
 * Priority: 1) Icon (emoji, text, or image URL), 2) Category image only if no icon.
 * @param {boolean} [frameless] — no gray plate behind photos; fill parent (use with sized wrapper).
 */
export default function CategoryIcon({ category, className = '', size = 'md', frameless = false }) {
  const name = typeof category === 'object' ? category?.name : 'Category';
  const icon = typeof category === 'object' ? category?.icon : null;
  const image = typeof category === 'object' ? category?.image : null;
  const imageUrl = typeof image === 'string' ? image : mediaObjectToUrl(image);

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

  // 1) Icon as image URL -> show icon image
  if (icon && isImageUrl(icon)) {
    return (
      <span className={photoWrap}>
        <Image src={icon} alt={name} fill className="object-cover" sizes={imageSizes} />
      </span>
    );
  }

  // 2) Icon as emoji/text -> show icon (no category image)
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

  // 3) No icon -> show category image only
  if (image && isImageUrl(image)) {
    return (
      <span className={photoWrap}>
        <Image src={image} alt={name} fill className="object-cover" sizes={imageSizes} />
      </span>
    );
  }

  // 3b) Image object with storageKey (new backend shape)
  if (imageUrl && isImageUrl(imageUrl)) {
    return (
      <span className={photoWrap}>
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes={imageSizes} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 ${s} ${className}`}
      aria-hidden
    >
      <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a1.994 1.994 0 01-.586-1.414V7a4 4 0 014-4z" />
      </svg>
    </span>
  );
}
