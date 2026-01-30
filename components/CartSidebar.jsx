'use client';

import Link from 'next/link';
import { useCart } from '../context/CartContext';
import CartItem from './CartItem';

export default function CartSidebar() {
  const { cartItems, cartTotal, showSidebarCart, setShowSidebarCart } = useCart();

  const handleClose = () => setShowSidebarCart(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300 ${
          showSidebarCart ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white z-[95] shadow-2xl transition-transform duration-300 flex flex-col ${
          showSidebarCart ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cart</h2>
            <p className="text-sm text-gray-500">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {cartItems.length === 0 ? (
            <p className="text-sm text-gray-500">Your cart is empty.</p>
          ) : (
            cartItems.map((item) => (
              <CartItem key={item.cartItemKey || item.id} item={item} />
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>₹{cartTotal.toFixed(0)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={handleClose}
            className={`block text-center w-full py-3 rounded-full font-semibold text-base transition ${
              cartItems.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            Checkout
          </Link>
          <Link
            href="/cart"
            onClick={handleClose}
            className="block text-center w-full py-2 rounded-full font-semibold text-sm text-primary-dark border border-primary/30 hover:bg-primary/10 transition"
          >
            View Cart
          </Link>
        </div>
      </aside>
    </>
  );
}

