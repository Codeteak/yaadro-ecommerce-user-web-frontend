'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../utils/categoryImage';

export default function CategoryCard({ category }) {
  const categoryName =
    typeof category === 'string' ? category : category?.name || 'Category';
  const catObj = typeof category === 'object' ? category : { name: categoryName };

  const initialSrc = getCategoryImageUrl(catObj);
  const [imgSrc, setImgSrc] = useState(initialSrc || CATEGORY_DUMMY_IMAGE);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
    >
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 transition-transform duration-200 group-hover:scale-[1.04] sm:h-24 sm:w-24 md:h-28 md:w-28">
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
      <h3 className="text-xs sm:text-sm md:text-base font-bold text-white text-center leading-tight max-w-[6.5rem] sm:max-w-[7rem] md:max-w-[8.5rem] break-words min-h-[2.25rem] flex items-center justify-center">
        {categoryName}
      </h3>
    </Link>
  );
}
