'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { SearchRegular as Search } from '../icons';
import { getProductDetailPath } from '../../utils/productApi';
import { navigateToProductDetail } from '../../utils/productNavigation';
import { useProductSearchSuggest } from '../../hooks/useProductSearchSuggest';
import { getStablePortalContainer } from '../../lib/pwa/safePortal';

export default function SearchSuggestInput({
  value,
  onValueChange,
  onSubmitQuery,
  onFocus,
  onBlur,
  placeholder = 'Search products…',
  inputRef,
  className = '',
  shellClassName = '',
  iconClassName = '',
  iconColor,
  IconComponent = Search,
  inputClassName = '',
  autoFocus = false,
  showSearchIcon = true,
  enableSuggestions = true,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  const q = value != null ? String(value) : '';
  const trimmed = q.trim();
  const enableSuggest = enableSuggestions && trimmed.length >= 2;

  const { suggestions, isLoadingCatalog } = useProductSearchSuggest(trimmed, {
    enabled: enableSuggestions && (open || enableSuggest),
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

  const showDropdown =
    enableSuggestions && open && (trimmed.length >= 2 || isLoadingCatalog);

  // Icon color lives on the shell: MingCute sets inline `color: currentColor`,
  // so Tailwind text-* on the SVG itself cannot win — inheritance must.
  const defaultShell =
    'group flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 ' +
    'text-gray-400 transition-[border-color,background-color,box-shadow,color] duration-200 ease-out ' +
    'focus-within:border-[#902bf5] focus-within:bg-white focus-within:text-[#902bf5] ' +
    'focus-within:shadow-[0_0_0_3px_rgba(144,43,245,0.18)]';

  const defaultIcon = 'h-5 w-5 flex-shrink-0';

  const defaultInput =
    'w-full bg-transparent text-base text-gray-900 caret-[#902bf5] outline-none ' +
    'placeholder:text-gray-400';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div ref={rootRef} className={`relative ${className}`.trim()}>
        <Popover.Anchor asChild>
          <div className={shellClassName || defaultShell}>
            {showSearchIcon ? (
              <IconComponent
                size={20}
                {...(iconColor ? { color: iconColor } : {})}
                className={iconClassName || defaultIcon}
                aria-hidden
              />
            ) : null}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                onValueChange?.(e.target.value);
                if (enableSuggestions && !open) setOpen(true);
              }}
              onFocus={(e) => {
                if (enableSuggestions) setOpen(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                onBlur?.(e);
              }}
              onKeyDown={(e) => {
                if (!enableSuggestions) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit(trimmed);
                  }
                  return;
                }
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
                      navigateToProductDetail(router, row.href);
                      setOpen(false);
                    } else {
                      submit(trimmed);
                    }
                    return;
                  }
                  submit(trimmed);
                }
              }}
              placeholder={placeholder}
              className={inputClassName || defaultInput}
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
                  if (enableSuggestions) setOpen(true);
                }}
                className="px-2 text-[12px] font-semibold text-gray-500 hover:text-gray-700"
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}
          </div>
        </Popover.Anchor>

        {showDropdown ? (
          <Popover.Portal
            container={
              typeof document !== 'undefined'
                ? getStablePortalContainer() ?? undefined
                : undefined
            }
          >
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
                          onClick={(e) => {
                            e.preventDefault();
                            setOpen(false);
                            navigateToProductDetail(router, row.href);
                          }}
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
