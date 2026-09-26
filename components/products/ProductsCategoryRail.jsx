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
export function CategoryRailItem({ active, label, category, onClick, size = 'md' }) {
  const name = String(label || 'Category').trim();
  const initialSrc = getCategoryImageUrl(category) || CATEGORY_DUMMY_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;
  const compact = size === 'sm';
  const thumb = compact ? 'h-[40px] w-[40px] rounded-[12px]' : 'h-[52px] w-[52px] rounded-[15px]';
  const ringPad = compact ? 'rounded-[14px] p-[2px]' : 'rounded-[18px] p-[2.5px]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={name}
      className={[
        'group flex w-full flex-col items-center gap-1 px-0.5',
        compact ? 'py-1' : 'py-1.5 gap-1.5',
        'touch-manipulation transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
        'active:scale-[0.88]',
        active ? 'scale-[1.02]' : 'scale-100',
      ].join(' ')}
    >
      <span
        className={[
          `${ringPad} transition-all duration-200`,
          active
            ? 'bg-gradient-to-br from-[#902bf5] to-[#c084fc] shadow-[0_8px_18px_rgba(144,43,245,0.32)]'
            : 'bg-transparent group-hover:bg-[#902bf5]/15',
        ].join(' ')}
      >
        <span
          className={[
            `category-rail-thumb relative flex items-center justify-center overflow-hidden transition-all duration-200 ${thumb}`,
            active
              ? 'bg-white ring-2 ring-white'
              : 'bg-gray-50 ring-1 ring-gray-100 group-hover:ring-[#902bf5]/25 group-active:bg-[#902bf5]/10',
          ].join(' ')}
        >
          <Image
            src={imgSrc}
            alt={isDummy ? '' : name}
            fill
            sizes={compact ? '40px' : '52px'}
            className={[
              isDummy ? 'object-contain p-1' : 'object-cover object-center',
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
              className={`pointer-events-none absolute inset-0 bg-[#902bf5]/12 ${compact ? 'rounded-[12px]' : 'rounded-[15px]'}`}
              aria-hidden
            />
          ) : null}
        </span>
      </span>
      <span
        className={[
          'max-w-[4.5rem] truncate text-center font-bold uppercase leading-tight tracking-wide transition-colors duration-200',
          compact ? 'text-[9px]' : 'text-[10px]',
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

function ProductsCategoryRailInner({
  activeCategory,
  rootCategories = [],
  expandedRootId = null,
  onSelectAll,
  onCategorySelect,
}) {
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();
  const { bottomNavHeight } = useLayoutHeights();

  const bottomInset = bottomNavVisible ? bottomNavHeight : 0;
  const allActive = String(activeCategory || '').toLowerCase() === 'all';

  return (
    <aside
      className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-100 bg-transparent py-2 sm:w-[84px] top-[calc(5.75rem+env(safe-area-inset-top,0px))]"
      style={{
        maxHeight: `calc(100dvh - env(safe-area-inset-top,0px) - 5.75rem - ${bottomInset}px)`,
      }}
    >
      <div className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto scrollbar-hide px-1 pb-4">
        <CategoryRailItem
          active={allActive}
          label="All"
          category={null}
          onClick={onSelectAll}
        />
        {rootCategories.map((cat) => {
          const id = String(cat.id || cat._id || '').trim();
          if (!id) return null;
          const children = (cat.children || []).filter((c) => c && c.isActive !== false);
          const expanded = expandedRootId != null && String(expandedRootId) === id;
          const parentActive =
            String(activeCategory) === id ||
            (expanded &&
              children.some((c) => String(c.id || c._id) === String(activeCategory)));

          return (
            <div key={id} className="flex flex-col items-stretch">
              <CategoryRailItem
                active={parentActive && String(activeCategory) === id}
                label={String(cat.name || '').trim() || 'Category'}
                category={cat}
                onClick={() => onCategorySelect(id)}
              />
              {expanded && children.length > 0 ? (
                <div
                  className="ml-0.5 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[#902bf5]/25 pl-1"
                  role="group"
                  aria-label={`${cat.name || 'Category'} subcategories`}
                >
                  {children.map((child) => {
                    const childId = String(child.id || child._id || '').trim();
                    if (!childId) return null;
                    return (
                      <CategoryRailItem
                        key={childId}
                        size="sm"
                        active={String(activeCategory) === childId}
                        label={String(child.name || '').trim() || 'Category'}
                        category={child}
                        onClick={() => onCategorySelect(childId)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** Left category rail — isolated from listing so filter/sort/in-results search do not re-render it. */
export default memo(ProductsCategoryRailInner);
