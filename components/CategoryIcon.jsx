'use client';

import Image from 'next/image';

/**
 * Renders category icon for navbar/cards.
 * Priority: 1) Icon (emoji, text, or image URL), 2) Category image only if no icon.
 */
export default function CategoryIcon({ category, className = '', size = 'md' }) {
  const name = typeof category === 'object' ? category?.name : 'Category';
  const icon = typeof category === 'object' ? category?.icon : null;
  const image = typeof category === 'object' ? category?.image : null;

  const sizeClasses = {
    xs: 'w-6 h-6 text-base',
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };
  const s = sizeClasses[size] || sizeClasses.md;

  const isImageUrl = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
  };

  // 1) Icon as image URL -> show icon image
  if (icon && isImageUrl(icon)) {
    return (
      <span className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ${s} ${className}`}>
        <Image src={icon} alt={name} fill className="object-cover" sizes="48px" />
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
      <span className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ${s} ${className}`}>
        <Image src={image} alt={name} fill className="object-cover" sizes="48px" />
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
