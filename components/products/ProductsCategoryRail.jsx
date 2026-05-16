'use client';

import { memo } from 'react';

function categoryThumbUrl(cat) {
  if (!cat || typeof cat.image !== 'string') return null;
  const u = cat.image.trim();
  return u.length > 0 ? u : null;
}

function CategoryRailItem({ active, label, imageUrl, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition ${
        active
          ? 'bg-violet-100 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]'
          : 'bg-transparent hover:bg-gray-50 active:bg-gray-100'
      }`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 block h-full w-full object-contain object-center"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[15px] font-bold text-gray-400">
            {(label || '?').slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={`max-w-[4.5rem] text-center text-[10px] leading-tight ${
          active ? 'font-bold text-violet-950' : 'font-medium text-gray-600'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function ProductsCategoryRailInner({ activeCategory, rootCategories, onCategorySelect }) {
  return (
    <aside
      className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-200 bg-white py-2 sm:w-[80px] top-[calc(52px+env(safe-area-inset-top,0px))]"
      style={{
        maxHeight:
          'calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 52px)',
      }}
    >
      <div className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-4">
        <CategoryRailItem
          active={activeCategory === 'all'}
          label="All"
          imageUrl={null}
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
              imageUrl={categoryThumbUrl(cat)}
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
