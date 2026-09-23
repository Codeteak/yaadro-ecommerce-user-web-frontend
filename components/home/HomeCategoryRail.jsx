'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';
import { Bone } from '../skeletons/primitives';
import SmoothDragRail from '../motion/SmoothDragRail';

function categoryKey(category) {
  return String(category?.id ?? category?._id ?? '');
}

function CategoryChip({ category, selected, onSelect }) {
  const name = String(category?.name || 'Category').trim();
  const label = name.toUpperCase();
  const initialSrc = getCategoryImageUrl(category);
  const [imgSrc, setImgSrc] = useState(initialSrc || CATEGORY_DUMMY_IMAGE);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      className={[
        'group flex w-[80px] shrink-0 flex-col items-center gap-2',
        'touch-manipulation transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
        'active:scale-[0.88]',
        selected ? 'scale-[1.02]' : 'scale-100',
      ].join(' ')}
      aria-pressed={selected}
      aria-label={name}
    >
      <span
        className={[
          'rounded-[24px] p-[3px] transition-all duration-200',
          selected
            ? 'bg-gradient-to-br from-[#902bf5] to-[#c084fc] shadow-[0_10px_24px_rgba(144,43,245,0.35)]'
            : 'bg-transparent group-hover:bg-[#902bf5]/15',
        ].join(' ')}
      >
        <span
          className={[
            'relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[21px] transition-all duration-200',
            selected
              ? 'bg-white ring-2 ring-white'
              : 'bg-gray-50 ring-1 ring-gray-100 group-hover:ring-[#902bf5]/25 group-active:bg-[#902bf5]/10',
          ].join(' ')}
        >
          <Image
            src={imgSrc}
            alt={isDummy ? '' : name}
            fill
            className={[
              isDummy ? 'object-contain p-2' : 'object-cover object-center',
              'transition-transform duration-200 group-active:scale-95',
              selected ? 'scale-[1.04]' : '',
            ].join(' ')}
            sizes="72px"
            onError={() => {
              if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
            }}
            unoptimized
          />
          {selected ? (
            <span
              className="pointer-events-none absolute inset-0 rounded-[21px] bg-[#902bf5]/12"
              aria-hidden
            />
          ) : null}
        </span>
      </span>
      <span
        className={[
          'max-w-[80px] truncate text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors duration-200',
          selected ? 'text-[#902bf5]' : 'text-gray-700 group-active:text-[#902bf5]',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'h-1 w-6 rounded-full transition-all duration-200',
          selected ? 'scale-100 bg-[#902bf5] opacity-100' : 'scale-75 bg-transparent opacity-0',
        ].join(' ')}
        aria-hidden
      />
    </button>
  );
}

export default function HomeCategoryRail({
  categories = [],
  selectedId = null,
  onSelect,
  isLoading = false,
}) {
  const selectedCategory = useMemo(() => {
    if (selectedId == null) return null;
    return (
      categories.find((c) => String(categoryKey(c)) === String(selectedId)) || null
    );
  }, [categories, selectedId]);

  const selectedName = String(selectedCategory?.name || '').trim();

  if (isLoading && categories.length === 0) {
    return (
      <div className="mt-5">
        <SmoothDragRail
          className="py-1.5"
          trackClassName="items-start gap-4 px-5 sm:px-6"
          ariaLabel="Loading categories"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[80px] shrink-0 flex-col items-center gap-2">
              <Bone className="h-[72px] w-[72px] rounded-[21px]" />
              <Bone className="h-3 w-12 rounded" />
              <Bone className="h-1 w-6 rounded-full" />
            </div>
          ))}
        </SmoothDragRail>
      </div>
    );
  }

  if (!categories.length) return null;

  return (
    <div className="mt-5">
      <SmoothDragRail
        className="py-1.5"
        trackClassName="items-start gap-3 px-5 sm:px-6"
        ariaLabel="Categories"
      >
        {categories.map((category) => {
          const id = categoryKey(category);
          return (
            <CategoryChip
              key={id || category.name}
              category={category}
              selected={selectedId != null && String(selectedId) === id}
              onSelect={onSelect}
            />
          );
        })}
      </SmoothDragRail>

      {selectedName ? (
        <div
          key={selectedName}
          className="mt-4 animate-fade-in px-4 text-center sm:px-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#902bf5]/80">
            Browsing
          </p>
          <h2 className="mt-1 font-headingnow text-[2.15rem] font-extrabold uppercase leading-none tracking-wide text-gray-900 sm:text-[2.65rem]">
            {selectedName}
          </h2>
        </div>
      ) : null}
    </div>
  );
}
