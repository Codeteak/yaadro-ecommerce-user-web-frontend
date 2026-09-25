'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';
import { useBottomNavVisibility } from '../../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../../context/LayoutHeightsContext';

/**
 * Matches HomeCategoryRail chip selection: gradient ring, scale, violet label, underline bar.
 * Sized for the products page vertical rail.
 */
export function CategoryRailItem({ active, label, category, onClick }) {
  const name = String(label || 'Category').trim();
  const initialSrc = getCategoryImageUrl(category) || CATEGORY_DUMMY_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={name}
      className={[
        'group flex w-full flex-col items-center gap-1.5 px-0.5 py-1.5',
        'touch-manipulation transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
        'active:scale-[0.88]',
        active ? 'scale-[1.02]' : 'scale-100',
      ].join(' ')}
    >
      <span
        className={[
          'rounded-[18px] p-[2.5px] transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-[#902bf5] to-[#c084fc] shadow-[0_8px_18px_rgba(144,43,245,0.32)]'
            : 'bg-transparent group-hover:bg-[#902bf5]/15',
        ].join(' ')}
      >
        <span
          className={[
            'category-rail-thumb relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[15px] transition-all duration-200',
            active
              ? 'bg-white ring-2 ring-white'
              : 'bg-gray-50 ring-1 ring-gray-100 group-hover:ring-[#902bf5]/25 group-active:bg-[#902bf5]/10',
          ].join(' ')}
        >
          <Image
            src={imgSrc}
            alt={isDummy ? '' : name}
            fill
            sizes="52px"
            className={[
              isDummy ? 'object-contain p-1.5' : 'object-cover object-center',
              'transition-transform duration-200 group-active:scale-95',
              active ? 'scale-[1.04]' : '',
            ].join(' ')}
            onError={() => {
              if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
            }}
            unoptimized
          />
          {active ? (
            <span
              className="pointer-events-none absolute inset-0 rounded-[15px] bg-[#902bf5]/12"
              aria-hidden
            />
          ) : null}
        </span>
      </span>
      <span
        className={[
          'max-w-[4.5rem] truncate text-center text-[10px] font-bold uppercase leading-tight tracking-wide transition-colors duration-200',
          active ? 'text-[#902bf5]' : 'text-gray-600 group-active:text-[#902bf5]',
        ].join(' ')}
      >
        {name}
      </span>
      <span
        className={[
          'h-1 w-5 rounded-full transition-all duration-200',
          active ? 'scale-100 bg-[#902bf5] opacity-100' : 'scale-75 bg-transparent opacity-0',
        ].join(' ')}
        aria-hidden
      />
    </button>
  );
}

function ProductsCategoryRailInner({ activeCategory, rootCategories, onCategorySelect }) {
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();
  const { bottomNavHeight } = useLayoutHeights();

  const bottomInset = bottomNavVisible ? bottomNavHeight : 0;

  return (
    <aside
      className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-100 bg-transparent py-2 sm:w-[84px] top-[calc(5.75rem+env(safe-area-inset-top,0px))]"
      style={{
        maxHeight: `calc(100dvh - env(safe-area-inset-top,0px) - 5.75rem - ${bottomInset}px)`,
      }}
    >
      <div className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto scrollbar-hide px-1 pb-4">
        <CategoryRailItem
          active={activeCategory === 'all'}
          label="All"
          category={null}
          onClick={() => onCategorySelect('all')}
        />
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
