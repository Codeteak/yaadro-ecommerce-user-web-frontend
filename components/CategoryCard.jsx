'use client';

import Link from 'next/link';
import CategoryIcon, { categoryShowsPhoto } from './CategoryIcon';

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
            : 'flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-1 transition-transform duration-200 group-hover:scale-[1.04] sm:h-24 sm:w-24 md:h-28 md:w-28'
        }
      >
        <CategoryIcon category={catObj} size="lg" frameless={photo} />
      </div>
      <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 text-center leading-tight max-w-[6.5rem] sm:max-w-[7rem] md:max-w-[8.5rem] break-words min-h-[2.25rem] flex items-center justify-center">
        {categoryName}
      </h3>
    </Link>
  );
}
