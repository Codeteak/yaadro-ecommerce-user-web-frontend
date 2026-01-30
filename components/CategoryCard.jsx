'use client';

import Link from 'next/link';
import CategoryIcon from './CategoryIcon';

export default function CategoryCard({ category }) {
  const categoryName = typeof category === 'string' ? category : (category?.name || 'Category');

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
    >
      <div className="rounded-xl p-1.5 transition-transform duration-200 group-hover:scale-105 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        <CategoryIcon category={typeof category === 'object' ? category : { name: categoryName }} size="md" className="w-full h-full" />
      </div>
      <h3 className="text-[10px] sm:text-xs font-semibold text-gray-800 text-center leading-tight max-w-[4.5rem] sm:max-w-[5.5rem] break-words min-h-[2rem] flex items-center justify-center">
        {categoryName}
      </h3>
    </Link>
  );
}
