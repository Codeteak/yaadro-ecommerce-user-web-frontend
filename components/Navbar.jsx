'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAddress } from '../context/AddressContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useCategoriesTree, useSearchProducts } from '../hooks/useProducts';
import { User } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

const SCROLL_THRESHOLD_HIDE = 50;
const SCROLL_THRESHOLD_SHOW = 20;

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cartCount, setShowSidebarCart } = useCart();
  const { isAuthenticated, user, setShowLoginSheet } = useAuth();
  const { getDefaultAddress } = useAddress();
  const { setNavbarHeight } = useLayoutHeights();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(true);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navRef = useRef(null);

  const defaultAddress = getDefaultAddress();
  const addressLine = defaultAddress
    ? [defaultAddress.city, defaultAddress.street || defaultAddress.address].filter(Boolean).slice(0, 2).join(', ') || 'Add address'
    : 'Add address';

  const { data: categoryTree = [] } = useCategoriesTree();
  const rootCategories = (categoryTree || []).filter((c) => c.isActive && (c.level === 0 || c.parentId == null));

  // Search products using TanStack Query
  const { data: searchData } = useSearchProducts({
    q: searchQuery,
    page: 1,
    per_page: 8,
  });

  const searchResults = searchQuery.trim().length >= 2 ? (searchData?.products || []) : [];

  useEffect(() => {
    if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchQuery, searchResults]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
      };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Measure navbar height and report to layout
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setNavbarHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setNavbarHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [setNavbarHeight, categoriesVisible]);

  // Collapse search + categories when scrolling down; show when back at top
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY ?? 0;
        setCategoriesVisible((prev) => {
          if (y <= SCROLL_THRESHOLD_SHOW) return true;
          if (y >= SCROLL_THRESHOLD_HIDE) return false;
          return prev;
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide navbar on checkout page - MUST be after all hooks
  if (pathname === '/checkout') return null;

  const handleProductClick = (productId) => {
    setSearchQuery('');
    setShowResults(false);
    router.push(`/products/${productId}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
    }
  };

  return (
    <nav ref={navRef} className="bg-white border-b border-gray-100 shadow-sm fixed top-0 left-0 z-50 w-full transition-[height] duration-300 ease-out">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        {/* Top row: delivery time + address (left), profile + cart (right) */}
        <div className="pt-3 pb-2 flex items-center justify-between gap-4">
          {/* Left: delivery time (bold) + active address */}
          <div className="flex flex-col min-w-0 flex-shrink">
            <span className="text-sm font-bold text-gray-900">5 min</span>
            <Link
              href="/profile"
              className="text-xs text-gray-600 truncate max-w-[180px] sm:max-w-xs hover:text-primary"
              title={addressLine}
            >
              {addressLine}
            </Link>
          </div>

          {/* Right: profile icon + cart */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <Link
                href="/settings"
                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
                aria-label="Settings"
              >
                <User className="w-6 h-6" strokeWidth={2} />
              </Link>
            ) : (
              <button
                onClick={() => setShowLoginSheet(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
                aria-label="Login"
              >
                <User className="w-6 h-6" strokeWidth={2} />
              </button>
            )}
            <button
              onClick={() => setShowSidebarCart(true)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
              aria-label="Cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar + Promo banner row (screenshot layout) - always visible */}
        <div className="flex items-stretch gap-2 pb-3">
          <div className="flex-1 min-w-0 relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-2xl w-full focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-shadow">
                <svg className="w-5 h-5 text-gray-800 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
                <input
                  type="text"
                  placeholder='Search for "Milk"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                  className="w-full border-0 outline-none text-sm text-gray-900 placeholder:text-gray-500 bg-transparent"
                />
              </div>
            </form>
          
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div
                ref={resultsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[100] max-h-96 overflow-y-auto"
              >
              <div className="p-2">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={product.image || '/images/dummy.png'}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-800 truncate">{product.name}</h4>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                  </button>
                ))}
                {searchQuery.trim() && (
                  <Link
                    href={`/products?search=${encodeURIComponent(searchQuery)}`}
                    className="block w-full p-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-t border-gray-200 mt-2"
                    onClick={() => setShowResults(false)}
                  >
                    View all results for "{searchQuery}"
                  </Link>
                )}
                </div>
              </div>
            )}
          </div>

          {/* Promo banner - right of search (screenshot style) */}
          <Link
            href="/products"
            className="flex flex-shrink-0 w-20 sm:w-28 lg:w-36 rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Offers"
          >
            <div className="flex flex-col justify-center px-2 py-2 min-h-[44px] w-full">
              <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-green-800 leading-tight truncate">OFFERS</span>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] text-green-700 mt-0.5 truncate">Shop now</span>
            </div>
          </Link>
        </div>

        {/* Categories row: only icons hide on scroll; text labels always visible; row shrinks when icons hidden */}
        <div
          className={`flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide text-gray-700 min-h-0 transition-[padding,align-items] duration-300 ease-out ${categoriesVisible ? 'items-end pb-3' : 'items-center pb-0.5'}`}
        >
          <Link
            href="/"
            className={`relative flex flex-col items-center px-2 flex-shrink-0 group transition-[gap,padding] duration-300 ease-out ${categoriesVisible ? 'gap-1.5 py-2' : 'gap-0 py-0'}`}
          >
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-out overflow-hidden w-9 sm:w-10"
              style={{ gridTemplateRows: categoriesVisible ? '1fr' : '0fr', opacity: categoriesVisible ? 1 : 0 }}
            >
              <span className="min-h-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-600 text-lg group-hover:bg-gray-200 transition-colors" aria-hidden>
                ⌂
              </span>
            </div>
            <span className={`text-[11px] sm:text-xs font-semibold text-center max-w-[4rem] truncate ${pathname === '/' ? 'text-gray-900' : 'text-gray-600'}`}>
              All
            </span>
            {pathname === '/' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-1 bg-black rounded-full" aria-hidden />}
          </Link>
          {rootCategories.map((cat) => {
            const isActive = pathname === '/products' && (searchParams.get('category') === cat.name || searchParams.get('category') === cat.slug);
            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className={`relative flex flex-col items-center px-2 flex-shrink-0 group transition-[gap,padding] duration-300 ease-out ${categoriesVisible ? 'gap-1.5 py-2' : 'gap-0 py-0'}`}
              >
                <div
                  className="grid transition-[grid-template-rows,opacity] duration-300 ease-out overflow-hidden w-9 sm:w-10"
                  style={{ gridTemplateRows: categoriesVisible ? '1fr' : '0fr', opacity: categoriesVisible ? 1 : 0 }}
                >
                  <div className="min-h-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <CategoryIcon category={cat} size="sm" className="w-full h-full" />
                  </div>
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold text-center max-w-[4rem] truncate ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                  {cat.name}
                </span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-1 bg-black rounded-full" aria-hidden />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

