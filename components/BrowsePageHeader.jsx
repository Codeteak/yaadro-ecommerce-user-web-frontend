'use client';

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
}) {
  return (
    <header className="sticky top-0 z-40 bg-gray-50">
      <div className="flex items-center gap-1 px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-0 bg-transparent p-0"
          aria-label="Back"
        >
          <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-gray-900 sm:text-[16px]">
          {title}
        </h1>
        <button
          type="button"
          onClick={onSearchToggle}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-0 bg-transparent p-0"
          aria-expanded={searchOpen}
          aria-label={searchAriaLabel}
        >
          <svg
            className={`h-[18px] w-[18px] ${searchOpen ? 'text-violet-700' : 'text-gray-800'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
      {searchOpen && searchSlot ? <div className="px-3 pb-2.5 pt-0 sm:px-4">{searchSlot}</div> : null}
    </header>
  );
}
