'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { SearchRegular as Search } from '../icons';
import { getProductDetailPath } from '../../utils/productApi';
import { useProductSearchSuggest } from '../../hooks/useProductSearchSuggest';

export default function SearchSuggestInput({
  value,
  onValueChange,
  onSubmitQuery,
  placeholder = 'Search products…',
  inputRef,
  className = '',
  autoFocus = false,
  showSearchIcon = true,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  const q = value != null ? String(value) : '';
  const trimmed = q.trim();
  const enableSuggest = trimmed.length >= 2;

  const { suggestions, isLoadingCatalog } = useProductSearchSuggest(trimmed, {
    enabled: open || enableSuggest,
    limit: 8,
    catalogLimit: 50,
  });

  const items = useMemo(() => {
    const rows = (suggestions || [])
      .map((hit) => {
        const product = hit?.product || null;
        if (!product?.id) return null;
        const name = (hit?.name || product?.name || 'Product').toString().trim();
        const category = (hit?.category || product?.category || '').toString().trim();
        return {
          type: 'product',
          key: `p:${product.id}`,
          label: name,
          sublabel: category,
          href: getProductDetailPath(product),
        };
      })
      .filter(Boolean);

    if (trimmed.length >= 2) {
      rows.unshift({
        type: 'query',
        key: `q:${trimmed}`,
        label: `Search for “${trimmed}”`,
      });
    }
    return rows;
  }, [suggestions, trimmed]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmed, open]);

  const submit = (text) => {
    const next = String(text || '').trim();
    onSubmitQuery?.(next);
    setOpen(false);
  };

  const showDropdown = open && (trimmed.length >= 2 || isLoadingCatalog);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div ref={rootRef} className={`relative ${className}`.trim()}>
        <Popover.Anchor asChild>
          <div className="flex items-center gap-2 px-3 h-11 rounded-full border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-violet-500 transition">
            {showSearchIcon ? <Search size={20} className="h-5 w-5 text-gray-400 flex-shrink-0" /> : null}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                onValueChange?.(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  if (!open) setOpen(true);
                  e.preventDefault();
                  setActiveIndex((prev) => Math.min(items.length - 1, prev + 1));
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((prev) => Math.max(-1, prev - 1));
                  return;
                }
                if (e.key === 'Escape') {
                  setOpen(false);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (activeIndex >= 0 && items[activeIndex]) {
                    const row = items[activeIndex];
                    if (row.type === 'product' && row.href) {
                      window.location.href = row.href;
                    } else {
                      submit(trimmed);
                    }
                    return;
                  }
                  submit(trimmed);
                }
              }}
              placeholder={placeholder}
              className="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search products"
              autoFocus={autoFocus}
            />
            {trimmed.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onValueChange?.('');
                  setOpen(true);
                }}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-2"
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}
          </div>
        </Popover.Anchor>

        {showDropdown ? (
          <Popover.Portal>
            <Popover.Content
              className="z-[120] mt-2 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl outline-none"
              align="start"
              sideOffset={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {isLoadingCatalog && items.length === 0 ? (
                <p className="px-4 py-3 text-[12px] text-gray-500">Loading suggestions…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-3 text-[12px] text-gray-500">No suggestions</p>
              ) : (
                <ul className="max-h-80 overflow-auto py-1">
                  {items.map((row, index) => (
                    <li key={row.key}>
                      {row.type === 'product' ? (
                        <Link
                          href={row.href}
                          className={`block px-4 py-2.5 text-sm ${index === activeIndex ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setOpen(false)}
                        >
                          <p className="font-medium text-gray-900 truncate">{row.label}</p>
                          {row.sublabel ? <p className="text-[12px] text-gray-500 truncate">{row.sublabel}</p> : null}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium text-violet-700 ${index === activeIndex ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                          onClick={() => submit(trimmed)}
                        >
                          {row.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Popover.Content>
          </Popover.Portal>
        ) : null}
      </div>
    </Popover.Root>
  );
}
