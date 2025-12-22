'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { products, searchProducts } from '../data/products';

const categories = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Meat & Seafood', 'Bakery', 'Beverages', 'Snacks', 'Pantry', 'Frozen', 'Baby Care', 'Personal Care', 'Cleaning', 'Home & Kitchen', 'Health & Wellness', 'Spices & Condiments'];

export default function Navbar() {
  const { cartCount, setShowSidebarCart } = useCart();
  const { isAuthenticated, user, setShowLoginSheet } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = searchProducts(searchQuery).slice(0, 8); // Limit to 8 results
      setSearchResults(results);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

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
    <nav className="bg-white border-b border-gray-100 shadow-sm fixed top-0 left-0 z-50 w-full">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        {/* Top row */}
        <div className="py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-amber-500 whitespace-nowrap flex-shrink-0">
            <span>Yaadro</span>
          </Link>

          {/* Location - Desktop only */}
          <button className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-800 px-3 py-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
            <span>Select Location</span>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Search - Hidden on mobile */}
          <div className="flex-1 hidden sm:block relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-200">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
                <input
                  type="text"
                  placeholder='Search for "cheese slices"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                  className="w-full border-0 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent"
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

          {/* Auth / Cart - Top right corner */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="text-sm font-semibold text-gray-800 hover:text-gray-900 whitespace-nowrap">
                  {user?.name || user?.phone || 'Profile'}
                </Link>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginSheet(true)}
                className="text-sm font-semibold text-gray-800 hover:text-gray-900 whitespace-nowrap"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setShowSidebarCart(true)}
              className="relative flex items-center justify-center text-gray-800 hover:text-gray-900"
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
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category row */}
        <div className="pb-3 flex items-center gap-3 overflow-x-auto scrollbar-hide text-gray-700 font-semibold text-sm">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={cat === 'All' ? '/products' : `/products?category=${encodeURIComponent(cat)}`}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:text-amber-600 hover:bg-amber-50 whitespace-nowrap"
            >
              <span>{cat}</span>
            </Link>
          ))}
        </div>

        {/* Search bar - Mobile only, full width at bottom */}
        <div className="sm:hidden pb-3 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-amber-200 w-full">
              <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
              <input
                type="text"
                placeholder='Search for "cheese slices"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowResults(true)}
                className="w-full border-0 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent"
              />
            </div>
          </form>
          
          {/* Search Results Dropdown - Mobile */}
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
      </div>
    </nav>
  );
}

