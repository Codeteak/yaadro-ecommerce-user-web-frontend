'use client';

import IconBackButton from './ui/IconBackButton';
import { PRESSABLE_ICON_BTN_SOFT } from './ui/brandButton';

/**
 * Sticky list-page header matching `/products`: back, centered title, search toggle.
 */
export default function BrowsePageHeader({
  title,
  searchOpen = false,
  onBack,
  onSearchToggle,
  searchAriaLabel = 'Search',
  searchSlot = null,
  toolbar = null,
}) {
  return (
    <header className="sticky top-0 z-40 bg-gray-50">
      <div className="flex items-center gap-1 px-2 py-2 sm:px-3">
        <IconBackButton onClick={onBack} />
        <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-gray-900 sm:text-[16px]">
          {title}
        </h1>
        <button
          type="button"
          onClick={onSearchToggle}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-0 bg-transparent p-0 ${PRESSABLE_ICON_BTN_SOFT}`}
          aria-expanded={searchOpen}
          aria-label={searchAriaLabel}
        >
          <svg
            className={`h-[18px] w-[18px] ${searchOpen ? 'text-violet-700' : 'text-gray-800'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
      {searchOpen && searchSlot ? (
        <div className="px-3 pb-2.5 pt-0 sm:px-4">{searchSlot}</div>
      ) : null}
      {toolbar ? (
        <div className="px-2 pb-2 pl-[calc(76px+0.625rem)] sm:px-3 sm:pl-[calc(80px+0.75rem)]">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
