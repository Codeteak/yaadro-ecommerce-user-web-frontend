'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductSearchExperience from '../../components/search/ProductSearchExperience';

const SEARCH_BASE_PATH = '/search/';

function buildSearchHref(q) {
  if (!q) return SEARCH_BASE_PATH;
  return `${SEARCH_BASE_PATH}?q=${encodeURIComponent(q)}`;
}

/**
 * Deep-link / bookmark entry for search.
 * Primary home search never navigates here — it uses the same ProductSearchExperience
 * in overlay mode on the current page (no second search bar, no redirect).
 */
export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQ = (searchParams?.get('q') || '').trim();

  const handleQueryChange = useCallback((nextQ) => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    if (pathname !== '/search') return;
    const current = (new URLSearchParams(window.location.search).get('q') || '').trim();
    const q = String(nextQ || '').trim();
    if (current === q) return;
    window.history.replaceState(null, '', buildSearchHref(q));
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full bg-gray-50 pb-28">
      <ProductSearchExperience
        mode="page"
        initialQuery={initialQ}
        autoFocus
        onQueryChange={handleQueryChange}
        placeholder="Search products…"
      />
    </div>
  );
}
