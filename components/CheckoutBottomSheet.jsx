'use client';

import Image from 'next/image';

export default function CheckoutBottomSheet({ 
  isOpen, 
  cartItems, 
  cartTotal, 
  shipping, 
  discount, 
  grandTotal,
  onSubmit,
  isSubmitting,
  canSubmit
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-40 border-t border-gray-200 flex flex-col" style={{ maxHeight: '50vh' }}>
        {/* Drag Handle - Visual Only (Non-functional) */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
          
          {/* Order Items */}
          <div className="space-y-3 mb-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                  <Image
                    src={item.image || item.product?.images?.[0] || '/images/dummy.png'}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.sizeDisplay || (item.weight && item.unit ? `${item.weight}${item.unit}` : '')} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-orange-600 font-semibold">₹{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery:</span>
              <span className="text-orange-600 font-semibold">₹{shipping.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="text-primary font-semibold">-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Checkout'}
          </button>
        </div>
    </div>
  );
}
