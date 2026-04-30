'use client';

import CategoryIcon from './CategoryIcon';
import ExportLink from './ExportLink';

export default function CategoryCard({ category }) {
  const categoryName = typeof category === 'string' ? category : (category?.name || 'Category');

  return (
    <ExportLink
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
    >
      <div className="rounded-2xl p-1 transition-transform duration-200 group-hover:scale-[1.04] w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center bg-gray-50 border border-gray-100">
        <CategoryIcon
          category={typeof category === 'object' ? category : { name: categoryName }}
          size="lg"
          className="w-full h-full"
        />
      </div>
      <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 text-center leading-tight max-w-[6.5rem] sm:max-w-[7rem] md:max-w-[8.5rem] break-words min-h-[2.25rem] flex items-center justify-center">
        {categoryName}
      </h3>
    </ExportLink>
  );
}
