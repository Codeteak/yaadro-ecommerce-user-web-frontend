'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProductComparison } from '../context/ProductComparisonContext';
import { getProductRating, getProductDiscount, getDiscountedPrice, isOnSale } from '../utils/productUtils';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductComparison({ isOpen, onClose }) {
  const { comparisonList, removeFromComparison, clearComparison } = useProductComparison();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();

  if (!isOpen || comparisonList.length === 0) return null;

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  const handleAddToWishlist = (product) => {
    if (!isInWishlist(product.id)) {
      addToWishlist(product);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Compare Products</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={clearComparison}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Product</th>
                  {comparisonList.map((product) => (
                    <th key={product.id} className="text-center p-4 min-w-[200px]">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => removeFromComparison(product.id)}
                          className="self-end text-gray-400 hover:text-red-600 mb-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <Link href={`/products/${product.id}`}>
                          <div className="relative w-32 h-32 mb-2">
                            <Image
                              src={product.image || '/images/dummy.png'}
                              alt={product.name}
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        </Link>
                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-semibold text-gray-800 text-sm text-center hover:text-blue-600">
                            {product.name}
                          </h3>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-700">Price</td>
                  {comparisonList.map((product) => {
                    const discountedPrice = getDiscountedPrice(product);
                    const discount = getProductDiscount(product);
                    return (
                      <td key={product.id} className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-gray-900">₹{discountedPrice.toFixed(0)}</span>
                          {discount > 0 && (
                            <>
                              <span className="text-sm text-gray-500 line-through">₹{product.price.toFixed(0)}</span>
                              <span className="text-xs text-green-600 font-semibold">{discount}% OFF</span>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Rating */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-700">Rating</td>
                  {comparisonList.map((product) => {
                    const rating = getProductRating(product);
                    return (
                      <td key={product.id} className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <svg className="w-5 h-5 fill-yellow-400" viewBox="0 0 24 24">
                            <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                          </svg>
                          <span className="font-semibold">{rating.toFixed(1)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Category */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-700">Category</td>
                  {comparisonList.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      {product.category}
                    </td>
                  ))}
                </tr>

                {/* Stock Status */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-700">Availability</td>
                  {comparisonList.map((product) => (
                    <td key={product.id} className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.inStock 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Description */}
                <tr className="border-b border-gray-100">
                  <td className="p-4 font-medium text-gray-700">Description</td>
                  {comparisonList.map((product) => (
                    <td key={product.id} className="p-4 text-center text-sm text-gray-600">
                      <p className="line-clamp-3">{product.description}</p>
                    </td>
                  ))}
                </tr>

                {/* Actions */}
                <tr>
                  <td className="p-4 font-medium text-gray-700">Actions</td>
                  {comparisonList.map((product) => (
                    <td key={product.id} className="p-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.inStock}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            product.inStock
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => handleAddToWishlist(product)}
                          className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                        >
                          {isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}
                        </button>
                        <Link
                          href={`/products/${product.id}`}
                          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


