'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';
import { useBottomNavVisibility } from '../../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../../context/LayoutHeightsContext';

function CategoryRailItem({ active, label, category, onClick }) {
  const imageUrl = getCategoryImageUrl(category);
  const initialSrc = imageUrl || CATEGORY_DUMMY_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const isDummy = !imageUrl || imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="relative flex w-full flex-col items-center gap-1 px-1 py-2 transition"
    >
      <div
        className={`category-rail-thumb relative h-11 w-11 shrink-0 overflow-hidden rounded-full transition ${
          active
            ? 'bg-white ring-2 ring-violet-600 ring-offset-2 ring-offset-gray-50'
            : 'bg-white/90'
        }`}
      >
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="44px"
          className={
            isDummy
              ? 'object-contain object-center p-1.5'
              : 'object-cover object-center'
          }
          onError={() => {
            if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
          }}
          unoptimized
        />
      </div>
      <span
        className={`max-w-[4.5rem] text-center text-[10px] leading-tight ${
          active ? 'font-semibold text-violet-800' : 'font-medium text-gray-500'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function ProductsCategoryRailInner({ activeCategory, rootCategories, onCategorySelect }) {
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();
  const { bottomNavHeight } = useLayoutHeights();

  const bottomInset = bottomNavVisible ? bottomNavHeight : 0;

  return (
    <aside
      className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-100 bg-transparent py-2 sm:w-[80px] top-[calc(52px+env(safe-area-inset-top,0px))]"
      style={{
        maxHeight: `calc(100dvh - env(safe-area-inset-top,0px) - 52px - ${bottomInset}px)`,
      }}
    >
      <div className="flex max-h-[inherit] flex-col gap-1 overflow-y-auto overscroll-contain scrollbar-hide px-1.5 pb-4">
        {rootCategories.map((cat) => {
          const id = String(cat.id || '').trim();
          if (!id) return null;
          return (
            <CategoryRailItem
              key={id}
              active={activeCategory === id}
              label={String(cat.name || '').trim() || 'Category'}
              category={cat}
              onClick={() => onCategorySelect(id)}
            />
          );
        })}
      </div>
    </aside>
  );
}

/** Left category rail — isolated from listing so filter/sort/in-results search do not re-render it. */
export default memo(ProductsCategoryRailInner);
