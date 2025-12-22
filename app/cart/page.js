'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import CartItem from '../../components/CartItem';
import Container from '../../components/Container';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function CartPage() {
  const searchParams = useSearchParams();
  const { 
    cartItems, 
    cartTotal, 
    clearCart, 
    saveCart, 
    loadSavedCart, 
    deleteSavedCart, 
    savedCarts,
    saveCartAsTemplate,
    loadCartTemplate,
    deleteCartTemplate,
    cartTemplates,
    shareCart,
    loadSharedCart,
  } = useCart();
  const [showSaveCartModal, setShowSaveCartModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [cartName, setCartName] = useState('');

  const shipping = cartTotal > 0 ? 50 : 0;
  const grandTotal = cartTotal + shipping;

  // Handle shared cart from URL
  useEffect(() => {
    const shared = searchParams?.get('shared');
    if (shared) {
      loadSharedCart(shared);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSaveCart = () => {
    if (!cartName.trim()) {
      alert('Please enter a name for your cart');
      return;
    }
    saveCart(cartName);
    setCartName('');
    setShowSaveCartModal(false);
    alert('Cart saved successfully!');
  };

  const handleSaveAsTemplate = () => {
    if (!cartName.trim()) {
      alert('Please enter a name for your template');
      return;
    }
    saveCartAsTemplate(cartName);
    setCartName('');
    setShowTemplatesModal(false);
    alert('Cart template saved successfully!');
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }]} />
          <div className="text-center mt-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to your cart to get started.</p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }]} />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}

            {/* Cart Actions */}
            <div className="pt-4 flex flex-wrap gap-3">
              <button
                onClick={() => setShowSaveCartModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Save Cart
              </button>
              <button
                onClick={() => setShowTemplatesModal(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                Cart Templates
              </button>
              <button
                onClick={shareCart}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Cart
              </button>
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-800 font-medium transition-colors text-sm"
              >
                Clear Cart
              </button>
            </div>

            {/* Saved Carts */}
            {savedCarts.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Saved Carts</h3>
                <div className="space-y-2">
                  {savedCarts.map((savedCart) => (
                    <div key={savedCart.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{savedCart.name}</p>
                        <p className="text-xs text-gray-500">
                          {savedCart.items.length} items • {new Date(savedCart.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadSavedCart(savedCart.id)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this saved cart?')) {
                              deleteSavedCart(savedCart.id);
                            }
                          }}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md lg:sticky lg:top-24">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{cartTotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping:</span>
                  <span className="font-semibold">
                    {shipping > 0 ? `₹${shipping.toFixed(0)}` : 'Free'}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span>₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/products"
                  className="block text-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Continue Shopping
                </Link>
                <Link
                  href="/checkout"
                  className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Save Cart Modal */}
      {showSaveCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Save Cart</h2>
            <input
              type="text"
              value={cartName}
              onChange={(e) => setCartName(e.target.value)}
              placeholder="Enter cart name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveCart();
                } else if (e.key === 'Escape') {
                  setShowSaveCartModal(false);
                  setCartName('');
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveCart}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveCartModal(false);
                  setCartName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Cart Templates</h2>
              <button
                onClick={() => {
                  setShowTemplatesModal(false);
                  setCartName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Save Current Cart as Template */}
            {cartItems.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Save Current Cart as Template</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cartName}
                    onChange={(e) => setCartName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveAsTemplate();
                      }
                    }}
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            )}

            {/* Templates List */}
            {cartTemplates.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 mb-2">Saved Templates</h3>
                {cartTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{template.name}</p>
                      <p className="text-xs text-gray-500">
                        {template.items.length} items • {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          loadCartTemplate(template.id);
                          setShowTemplatesModal(false);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this template?')) {
                            deleteCartTemplate(template.id);
                          }
                        }}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No templates saved yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

