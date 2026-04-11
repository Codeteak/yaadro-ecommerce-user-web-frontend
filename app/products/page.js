'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getProductRating, getProductDiscount } from '../../utils/productUtils';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'Edible Oils', label: 'Edible Oils' },
  { key: 'Dairy', label: 'Dairy' },
  { key: 'Grains', label: 'Grains' },
  { key: 'Snacks', label: 'Snacks' },
  { key: 'Spices', label: 'Spices' },
  { key: 'Beverages', label: 'Beverages' },
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Sort' },
  { key: 'price-asc', label: 'Price: low' },
  { key: 'price-desc', label: 'Price: high' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function SearchBar({ value, onChange }) {
  return (
    <div className="relative flex-1">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search products…"
        className="w-full h-[38px] pl-9 pr-4 rounded-full border border-gray-200 bg-gray-50 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
      />
    </div>
  );
}

function CartButton({ count }) {
  return (
    <Link
      href="/cart"
      className="relative w-[38px] h-[38px] rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0"
      aria-label={`Cart — ${count} items`}
    >
      <svg className="w-[18px] h-[18px] text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center border-2 border-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}

function CategoryPills({ activeCategory, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5 bg-white border-b border-gray-100 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium border transition whitespace-nowrap ${
            activeCategory === cat.key
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

function FilterBar({ filters, onFilterToggle, sortKey, onSortChange }) {
  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortKey)?.label || 'Sort';
  const sortIdx = SORT_OPTIONS.findIndex((s) => s.key === sortKey);

  const handleSortClick = () => {
    const next = SORT_OPTIONS[(sortIdx + 1) % SORT_OPTIONS.length];
    onSortChange(next.key);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { key: 'organic', label: 'Organic', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          )},
          { key: 'inStock', label: 'In stock', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
          { key: 'onSale', label: 'On sale', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
            </svg>
          )},
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onFilterToggle(key)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition whitespace-nowrap ${
              filters[key]
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSortClick}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition ml-2 whitespace-nowrap ${
          sortKey !== 'default'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {sortLabel}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Product card
───────────────────────────────────────────── */
function ProductCard({ product }) {
  const { addToCart, cartItems } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const inCart = cartItems.some((i) => i.id === product.id);

  const price = parseFloat(product.price);
  const originalPrice = product.originalPrice || null;
  const discountPct = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const rating = getProductRating(product);
  const imageSrc = product.image || '/images/dummy.png';

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ ...product, price }, 1);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) removeFromWishlist(product.id);
    else addToWishlist(product);
  };

  return (
    <Link href={`/products/${product.slug || product.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition active:scale-[0.98]">
        {/* Image */}
        <div className="relative w-full aspect-square bg-gray-50">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges */}
          {discountPct > 0 && (
            <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {discountPct}% off
            </span>
          )}
          {product.organicTag && (
            <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Organic
            </span>
          )}

          {/* Out of stock overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-[11px] font-medium text-gray-500 px-3 py-1 rounded-full bg-white border border-gray-200">
                Out of stock
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition ${
              inWishlist
                ? 'bg-red-50 text-red-500'
                : 'bg-white text-gray-400 border border-gray-200 hover:text-red-400'
            }`}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg
              className="w-3.5 h-3.5"
              fill={inWishlist ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-2.5">
          <p className="text-[12px] font-medium text-gray-900 leading-snug mb-1 line-clamp-2">
            {product.name}
          </p>
          <p className="text-[11px] text-gray-400 mb-2">
            {product.weight && product.unit ? `${product.weight} ${product.unit}` : ''}
            {product.brand ? ` · ${product.brand}` : ''}
          </p>

          {rating > 0 && (
            <div className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mb-2">
              <svg className="w-2.5 h-2.5 fill-emerald-700" viewBox="0 0 24 24">
                <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
              </svg>
              {rating.toFixed(1)}
              {product.ratingsCount > 0 && (
                <span className="opacity-60 font-normal">({product.ratingsCount})</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[14px] font-medium text-gray-900">
                ₹{price.toLocaleString('en-IN')}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-[11px] text-gray-400 line-through ml-1.5">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {product.inStock && (
              <button
                onClick={handleAddToCart}
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                  inCart
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                }`}
                aria-label={inCart ? 'Already in cart' : 'Add to cart'}
              >
                {inCart ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Skeleton card (loading)
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
        <div className="h-4 bg-gray-100 rounded-full w-2/5 mt-3" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyState({ onReset }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-5v8" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-gray-700 mb-1">No products found</p>
      <p className="text-[12px] text-gray-400 mb-5">Try adjusting your filters or search query</p>
      <button
        onClick={onReset}
        className="text-[12px] font-medium text-emerald-600 hover:text-emerald-800 transition"
      >
        Clear all filters
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page content
───────────────────────────────────────────── */
function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cartItems } = useCart();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    searchParams?.get('category') || 'all'
  );
  const [filters, setFilters] = useState({
    organic: false,
    inStock: false,
    onSale: false,
  });
  const [sortKey, setSortKey] = useState('default');

  /* ── Sync category from URL ── */
  useEffect(() => {
    const cat = searchParams?.get('category');
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

  /* ── Fetch products ── */
  const queryParams = {
    category: activeCategory !== 'all' ? activeCategory : undefined,
    search: search || undefined,
    organic: filters.organic || undefined,
    inStock: filters.inStock || undefined,
    onSale: filters.onSale || undefined,
    sort: sortKey !== 'default' ? sortKey : undefined,
  };
  const { data, isLoading } = useProducts(queryParams);
  const products = data?.products || data || [];

  /* ── Client-side sort fallback (if API doesn't sort) ── */
  const sorted = [...products].sort((a, b) => {
    if (sortKey === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
    if (sortKey === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
    if (sortKey === 'rating') return getProductRating(b) - getProductRating(a);
    return 0;
  });

  /* ── Client-side filter fallback ── */
  const filtered = sorted.filter((p) => {
    if (filters.organic && !p.organicTag) return false;
    if (filters.inStock && !p.inStock) return false;
    if (filters.onSale) {
      const disc = getProductDiscount(p);
      if (!disc || disc <= 0) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchCat) return false;
    }
    return true;
  });

  const handleFilterToggle = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setSearch('');
    setActiveCategory('all');
    setFilters({ organic: false, inStock: false, onSale: false });
    setSortKey('default');
    router.replace('/products');
  };

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    if (cat === 'all') {
      router.replace('/products');
    } else {
      router.replace(`/products?category=${encodeURIComponent(cat)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} />
        <CartButton count={cartItems.length} />
      </div>

      {/* ── Category pills ── */}
      <CategoryPills activeCategory={activeCategory} onSelect={handleCategorySelect} />

      {/* ── Filter + sort bar ── */}
      <FilterBar
        filters={filters}
        onFilterToggle={handleFilterToggle}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />

      {/* ── Results count ── */}
      {!isLoading && (
        <p className="px-4 py-2 text-[11px] text-gray-400">
          {filtered.length > 0
            ? `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`
            : 'No products found'}
        </p>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-8">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? <EmptyState onReset={handleReset} />
          : filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page export
───────────────────────────────────────────── */
export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100 h-14" />
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-gray-100" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-4/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}