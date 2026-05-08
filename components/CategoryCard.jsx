'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mediaObjectToUrl } from '../utils/mediaUrl';

const DUMMY_CATEGORY_IMAGE = '/icons/dummy-category-card-icon.png';

function isUsableUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

function resolveCategoryImageSrc(category) {
  if (!category || typeof category !== 'object') return null;

  const fromImageObj =
    (category.image && typeof category.image === 'object' && category.image.url) ||
    (category.photo && typeof category.photo === 'object' && category.photo.url) ||
    (category.icon && typeof category.icon === 'object' && category.icon.url) ||
    null;

  const fromMediaShape =
    (category.image && typeof category.image === 'object' && mediaObjectToUrl(category.image)) ||
    (category.photo && typeof category.photo === 'object' && mediaObjectToUrl(category.photo)) ||
    (category.icon && typeof category.icon === 'object' && mediaObjectToUrl(category.icon)) ||
    null;

  const candidates = [
    fromImageObj,
    typeof category.image === 'string' ? category.image : null,
    category.imageUrl,
    category.image_url,
    typeof category.photo === 'string' ? category.photo : null,
    category.photoUrl,
    category.photo_url,
    typeof category.icon === 'string' ? category.icon : null,
    category.iconUrl,
    category.icon_url,
    fromMediaShape,
  ];

  for (const candidate of candidates) {
    if (isUsableUrl(candidate)) return candidate;
  }
  return null;
}

export default function CategoryCard({ category }) {
  const categoryName = typeof category === 'string' ? category : (category?.name || 'Category');
  const catObj = typeof category === 'object' ? category : { name: categoryName };

  const initialSrc = resolveCategoryImageSrc(catObj);
  const [imgSrc, setImgSrc] = useState(initialSrc || DUMMY_CATEGORY_IMAGE);
  const isDummy = imgSrc === DUMMY_CATEGORY_IMAGE;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
    >
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 transition-transform duration-200 group-hover:scale-[1.04] sm:h-24 sm:w-24 md:h-28 md:w-28">
        <Image
          src={imgSrc}
          alt={isDummy ? '' : categoryName}
          fill
          className={isDummy ? 'object-contain p-2' : 'object-cover'}
          sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
          onError={() => {
            if (!isDummy) setImgSrc(DUMMY_CATEGORY_IMAGE);
          }}
          unoptimized
          priority={false}
        />
      </div>
      <h3 className="text-xs sm:text-sm md:text-base font-bold text-white text-center leading-tight max-w-[6.5rem] sm:max-w-[7rem] md:max-w-[8.5rem] break-words min-h-[2.25rem] flex items-center justify-center">
        {categoryName}
      </h3>
    </Link>
  );
}
