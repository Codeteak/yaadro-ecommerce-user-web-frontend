'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';
import { Bone } from '../skeletons/primitives';

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
      className="flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5"
      aria-pressed={selected}
      aria-label={name}
    >
      <span
        className={`rounded-[22px] p-[2px] transition ${
          selected ? 'bg-[#902bf5]/35' : 'bg-transparent'
        }`}
      >
        <span
          className={`relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[20px] ${
            selected ? 'bg-[#902bf5]/10' : 'bg-gray-50 ring-1 ring-gray-100'
          }`}
        >
          <Image
            src={imgSrc}
            alt={isDummy ? '' : name}
            fill
            className={isDummy ? 'object-contain p-2' : 'object-cover object-center'}
            sizes="72px"
            onError={() => {
              if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
            }}
            unoptimized
          />
        </span>
      </span>
      <span
        className={`max-w-[76px] truncate text-center text-[11px] font-bold uppercase leading-tight tracking-wide ${
          selected ? 'text-[#902bf5]' : 'text-gray-900'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function HomeCategoryRail({
  categories = [],
  selectedId = null,
  onSelect,
  isLoading = false,
}) {
  if (isLoading && categories.length === 0) {
    return (
      <div className="mt-5 overflow-x-auto scrollbar-hide px-5 py-1.5 sm:px-6 scroll-px-5 sm:scroll-px-6">
        <div className="flex w-max gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
              <Bone className="h-[72px] w-[72px] rounded-[20px]" />
              <Bone className="h-3 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!categories.length) return null;

  return (
    <div className="mt-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-5 py-1.5 sm:px-6 scroll-px-5 sm:scroll-px-6">
      <div className="flex w-max items-start gap-4">
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
      </div>
    </div>
  );
}
