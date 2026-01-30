'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';

export default function CartNotification() {
  const { lastAddedItem, setLastAddedItem } = useCart();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastAddedItem) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setLastAddedItem(null);
        }, 300); // Wait for fade out animation
      }, 5000); // Show for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [lastAddedItem, setLastAddedItem]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setLastAddedItem(null);
    }, 300);
  };

  const handleGoToCart = () => {
    router.push('/cart');
    handleClose();
  };

  if (!lastAddedItem) return null;

  const imageSrc = lastAddedItem.image || '/images/dummy.png';
  const originalPrice = lastAddedItem.originalPrice || null;
  const currentPrice = lastAddedItem.price || 0;
  const discountValue = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : null;
  const sizeDisplay = lastAddedItem.sizeDisplay || (lastAddedItem.weight && lastAddedItem.unit ? `${lastAddedItem.weight} ${lastAddedItem.unit}` : '');
  const quantity = lastAddedItem.quantity || 1;

  return (
    <div
      className={`fixed top-20 right-4 z-[100] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-sm w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-base font-semibold text-gray-800">Added to Cart</span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Info */}
        <div className="flex gap-3 mb-3">
          {/* Product Image */}
          <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt={lastAddedItem.name || 'Product'}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
              {lastAddedItem.name || 'Product'}
            </h3>
            {sizeDisplay && (
              <p className="text-xs text-gray-500 mb-1">
                {sizeDisplay} x{quantity}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="bg-green-600 text-white text-sm font-semibold px-2 py-0.5 rounded">
                ₹{currentPrice.toFixed(0)}
              </span>
              {originalPrice && originalPrice > currentPrice && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{originalPrice.toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Go to Cart Button */}
        <button
          onClick={handleGoToCart}
          className="w-full py-2 px-4 border-2 border-primary text-primary-dark rounded-lg font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          Go to Cart
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

