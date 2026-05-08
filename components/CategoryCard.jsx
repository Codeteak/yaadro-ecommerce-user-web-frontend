'use client';

import Link from 'next/link';
import Image from 'next/image';
import CategoryIcon, { categoryShowsPhoto } from './CategoryIcon';

const DUMMY_CATEGORY_IMAGE = '/icons/dummy-category-card-icon.png';

export default function CategoryCard({ category }) {
  const categoryName = typeof category === 'string' ? category : (category?.name || 'Category');
  const catObj = typeof category === 'object' ? category : { name: categoryName };
  const photo = categoryShowsPhoto(catObj);

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
    >
      <div
        className={
          photo
            ? 'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-transform duration-200 group-hover:scale-[1.04] sm:h-24 sm:w-24 md:h-28 md:w-28'
            : 'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl   p-1 transition-transform duration-200 group-hover:scale-[1.04] sm:h-24 sm:w-24 md:h-28 md:w-28'
        }
      >
        {photo ? (
          <CategoryIcon category={catObj} size="lg" frameless />
        ) : (
          <Image
            src={DUMMY_CATEGORY_IMAGE}
            alt=""
            fill
            className="object-contain"
            sizes="112px"
            priority={false}
          />
        )}
      </div>
      <h3 className="text-xs sm:text-sm md:text-base font-bold text-white text-center leading-tight max-w-[6.5rem] sm:max-w-[7rem] md:max-w-[8.5rem] break-words min-h-[2.25rem] flex items-center justify-center">
        {categoryName}
      </h3>   
    </Link>
  );
}
