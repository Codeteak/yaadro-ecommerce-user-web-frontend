'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function MobileCartSheet({ isOpen, onClose }) {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();

  const shipping = cartTotal > 0 ? 50 : 0;
  const grandTotal = cartTotal + shipping;

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-[60] md:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{ transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[60] md:hidden transform ${
          isOpen 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          maxHeight: '90vh',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isOpen ? 'transform, opacity' : 'auto'
        }}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
              aria-label="Close cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Cart Items - Scrollable (Show max 3 items, rest scrollable) */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(3 * 100px)' }}>
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const itemKey = item.cartItemKey || item.id;
                return (
                  <div key={itemKey} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                  {/* Product Image */}
                  <Link href={`/products/${item.id}`} onClick={onClose}>
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.id}`} onClick={onClose}>
                      <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">
                        {item.name}
                      </h3>
                    </Link>
                      {item.sizeDisplay && (
                        <p className="text-gray-500 text-xs mb-1">{item.sizeDisplay}</p>
                      )}
                    <p className="text-gray-600 text-xs mb-2">
                      ₹{item.price.toFixed(0)} × {item.quantity}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        aria-label="Decrease quantity"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-800 w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                        aria-label="Increase quantity"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                      <button
                          onClick={() => removeFromCart(itemKey)}
                        className="ml-auto p-1 text-red-600 hover:text-red-700"
                        aria-label="Remove item"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Order Summary & Actions */}
        {cartItems.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200 bg-white">
            {/* Order Summary */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{cartTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Shipping:</span>
                <span className="font-semibold">
                  {shipping > 0 ? `₹${shipping.toFixed(0)}` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>₹{grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Link
                href="/checkout"
                onClick={onClose}
                className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="block w-full text-center text-blue-600 hover:text-blue-800 font-medium transition-colors py-2"
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

