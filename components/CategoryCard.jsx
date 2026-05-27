'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../utils/categoryImage';

export default function CategoryCard({ category }) {
  const categoryName =
    typeof category === 'string' ? category : category?.name || 'Category';
  const firstLine = categoryName.slice(0, 10);
  const secondLine = categoryName.length > 10 ? categoryName.slice(10) : '';
  const catObj = typeof category === 'object' ? category : { name: categoryName };

  const initialSrc = getCategoryImageUrl(catObj);
  const [imgSrc, setImgSrc] = useState(initialSrc || CATEGORY_DUMMY_IMAGE);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
    >
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-50 shadow-[0_8px_22px_rgba(0,0,0,0.10)] ring-1 ring-gray-200 transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.16)] sm:h-24 sm:w-24 md:h-28 md:w-28">
        <Image
          src={imgSrc}
          alt={isDummy ? '' : categoryName}
          fill
          className={isDummy ? 'object-contain p-2' : 'object-cover object-center'}
          sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
          onError={() => {
            if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
          }}
          unoptimized
          priority={false}
        />
      </div>
      <h3
        className="text-[11px] sm:text-xs md:text-sm font-semibold text-gray-900 text-center leading-[1.15] max-w-[10ch]"
        title={categoryName}
      >
        <span className="block">{firstLine}</span>
        {secondLine ? <span className="block break-all">{secondLine}</span> : null}
      </h3>
    </Link>
  );
}
