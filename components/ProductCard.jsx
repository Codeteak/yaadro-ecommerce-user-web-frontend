'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useProductComparison } from '../context/ProductComparisonContext';
import { getProductRating, getProductDiscount, getDiscountedPrice, isOnSale } from '../utils/productUtils';

export default function ProductCard({ product, isCarousel = false }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToComparison, isInComparison, removeFromComparison, comparisonList, maxCompare } = useProductComparison();
  
  const inWishlist = isInWishlist(product.id);
  const inComparison = isInComparison(product.id);
  const rating = getProductRating(product);
  const discount = getProductDiscount(product);
  const discountedPrice = getDiscountedPrice(product);
  const onSale = isOnSale(product);
  const imageSrc = product.image || '/images/dummy.png';
  
  // Get available sizes or use default weight/unit
  const availableSizes = product.sizes || (product.weight && product.unit ? [{ weight: product.weight, unit: product.unit, price: product.price }] : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);
  const [showSizeSelector, setShowSizeSelector] = useState(false);

  // Calculate current price based on selected size
  const basePrice = selectedSize ? selectedSize.price : product.price;
  const currentPrice = discount > 0 ? getDiscountedPrice({ ...product, price: basePrice }) : basePrice;
  const displayWeight = selectedSize ? `${selectedSize.weight} ${selectedSize.unit}` : (product.weight && product.unit ? `${product.weight} ${product.unit}` : '');

  const handleAddToCart = () => {
    if (availableSizes.length > 1 && !selectedSize) {
      setShowSizeSelector(true);
      return;
    }
    const productToAdd = {
      ...product,
      price: currentPrice,
      selectedSize: selectedSize,
      sizeDisplay: displayWeight,
    };
    addToCart(productToAdd, 1);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleComparisonToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inComparison) {
      removeFromComparison(product.id);
    } else {
      if (comparisonList.length >= maxCompare) {
        alert(`You can compare up to ${maxCompare} products. Please remove one first.`);
        return;
      }
      addToComparison(product);
    }
  };

  // Calculate discount if originalPrice exists (using current size price)
  const originalPrice = product.originalPrice || null;
  const discountValue = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : null;
  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const productTag = product.tag || product.category;

  return (
    <div className={`bg-transparent rounded-2xl border border-gray-200 hover:shadow-sm transition-all duration-200 group relative h-auto flex-shrink-0 ${
      isCarousel ? 'w-[140px]' : 'w-full'
    }`}>
      <div className="relative">
        <Link href={`/products/${product.id}`}>
          <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl p-1 max-h-[120px]">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart();
            }}
            className="px-3 py-1 border-2 border-pink-500 text-pink-500 text-xs font-semibold rounded-lg bg-white hover:bg-pink-50 transition"
            aria-label="Add to cart"
          >
            ADD
          </button>
          {!isCarousel && (
            <button
              onClick={handleComparisonToggle}
              className={`p-1.5 rounded-lg bg-white border-2 transition ${
                inComparison 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-400'
              }`}
              aria-label={inComparison ? "Remove from comparison" : "Add to comparison"}
              title={inComparison ? "Remove from comparison" : "Add to comparison"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-2 pb-2.5 pt-1.5">
        {/* Price Row */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center bg-green-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md">
            ₹{currentPrice.toFixed(0)}
          </span>
          {(originalPrice && originalPrice > currentPrice) || (discount > 0 && basePrice > currentPrice) ? (
            <span className="text-[10px] text-gray-500 line-through">₹{basePrice.toFixed(0)}</span>
          ) : null}
        </div>
        {(discount > 0 || (originalPrice && originalPrice > currentPrice)) && (
          <p className="text-[9px] text-green-700 font-semibold mt-1">
            {discount > 0 ? `${discount}% OFF` : `₹${(basePrice - currentPrice).toFixed(0)} OFF`}
          </p>
        )}

        {/* Product Name */}
        <Link href={`/products/${product.id}`}>
          <h3 className="mt-1 text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[30px]">
            {product.name}
          </h3>
        </Link>

        {/* Weight/Unit Display */}
        {displayWeight && (
          <p className="mt-0.5 text-[10px] text-gray-600">
            1 pack ({displayWeight})
          </p>
        )}

        {/* Tag */}
        {productTag && (
          <div className="mt-2">
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 bg-teal-50 rounded-md border border-teal-100">
              {productTag}
            </span>
          </div>
        )}

        {/* Rating */}
        <div className="mt-1 flex items-center gap-1 text-[10px] text-green-700 font-semibold">
          <svg className="w-3.5 h-3.5 fill-green-700" viewBox="0 0 24 24">
            <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
          </svg>
          <span>{rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

