'use client';

import { useState } from 'react';

export default function ProductFilters({ filters, onFilterChange, onClearFilters }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">Filters</span>
          {isOpen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        {(filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 || filters.brand || filters.rating > 0 || filters.inStock !== null || filters.onSale) && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
            </label>
            <div className="flex gap-4">
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={filters.priceRange[0]}
                onChange={(e) => onFilterChange({ ...filters, priceRange: [parseInt(e.target.value), filters.priceRange[1]] })}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={filters.priceRange[1]}
                onChange={(e) => onFilterChange({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹{filters.priceRange[0]}</span>
              <span>₹{filters.priceRange[1]}</span>
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <input
              type="text"
              placeholder="Search brand..."
              value={filters.brand || ''}
              onChange={(e) => onFilterChange({ ...filters, brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
            <div className="flex gap-2">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => onFilterChange({ ...filters, rating: filters.rating === rating ? 0 : rating })}
                  className={`px-3 py-1 border rounded-lg text-sm transition-colors ${
                    filters.rating >= rating
                      ? 'bg-primary border-primary-dark text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {rating}+ ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Availability</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={filters.inStock === true}
                  onChange={() => onFilterChange({ ...filters, inStock: true })}
                  className="w-4 h-4"
                />
                <span className="text-sm">In Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={filters.inStock === false}
                  onChange={() => onFilterChange({ ...filters, inStock: false })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Out of Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stock"
                  checked={filters.inStock === null}
                  onChange={() => onFilterChange({ ...filters, inStock: null })}
                  className="w-4 h-4"
                />
                <span className="text-sm">All</span>
              </label>
            </div>
          </div>

          {/* Discount/Sale Filter */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onSale}
                onChange={(e) => onFilterChange({ ...filters, onSale: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">On Sale / Discounted</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}


