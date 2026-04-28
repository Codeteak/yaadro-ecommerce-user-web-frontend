'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatRupeeINR } from '../utils/productUtils';

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart, updateCartItemNote } = useCart();
  const { addToWishlist } = useWishlist();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(item.note || '');

  const handleQuantityChange = (newQuantity) => {
    const itemKey = item.cartItemKey || item.id;
    updateQuantity(itemKey, newQuantity);
  };

  const handleRemove = () => {
    const itemKey = item.cartItemKey || item.id;
    removeFromCart(itemKey);
  };

  const handleSaveForLater = () => {
    addToWishlist(item);
    handleRemove();
  };

  const handleSaveNote = () => {
    const itemKey = item.cartItemKey || item.id;
    updateCartItemNote(itemKey, note);
    setShowNoteInput(false);
  };

  // Keep delivery estimate deterministic to avoid SSR/CSR hydration mismatch.
  const getEstimatedDelivery = () => {
    const today = new Date();
    const itemSeed = String(item.cartItemKey || item.id || item.name || '');
    const hash = Array.from(itemSeed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const deliveryDays = 3 + (hash % 3); // 3-5 days
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + deliveryDays);
    return deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const estimatedDelivery = useMemo(
    () => getEstimatedDelivery(),
    [item.cartItemKey, item.id, item.name]
  );

  const imageSrc = item.image || '/images/dummy.png';
  const unitPrice = parseFloat(item.price);
  const lineTotal = Number.isFinite(unitPrice) ? unitPrice * item.quantity : 0;
  const originalPrice =
    item.originalPrice != null ? parseFloat(item.originalPrice) : null;
  const hasDiscount =
    originalPrice != null && Number.isFinite(originalPrice) && originalPrice > unitPrice + 1e-9;
  const discountValue = hasDiscount ? originalPrice - unitPrice : null;

  return (
    <div className="flex gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
      {/* Product Image */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
              {item.name}
            </h3>
            {item.sizeDisplay && (
              <p className="text-[11px] text-gray-500 mt-0.5">{item.sizeDisplay}</p>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-500 transition"
            aria-label="Remove item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-md">
            ₹{formatRupeeINR(unitPrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[11px] text-gray-500 line-through">
                ₹{formatRupeeINR(originalPrice)}
              </span>
              <span className="text-[11px] text-green-700 font-semibold">
                ₹{formatRupeeINR(discountValue)} OFF
              </span>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-semibold"
            >
              -
            </button>
            <span className="w-8 text-center text-sm font-semibold text-gray-800">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-semibold"
            >
              +
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">₹{formatRupeeINR(lineTotal)}</p>
          </div>
        </div>

        {/* Estimated Delivery */}
        <div className="mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Est. delivery: {estimatedDelivery}
          </span>
        </div>

        {/* Note Section */}
        {item.note && !showNoteInput && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <span className="font-medium">Note: </span>
            {item.note}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveForLater}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Save for later
          </button>
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {item.note ? 'Edit note' : 'Add note'}
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveNote();
                  } else if (e.key === 'Escape') {
                    setNote(item.note || '');
                    setShowNoteInput(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleSaveNote}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setNote(item.note || '');
                  setShowNoteInput(false);
                }}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

