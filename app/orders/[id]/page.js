'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '../../../context/OrderContext';
import { useCart } from '../../../context/CartContext';
import Container from '../../../components/Container';
import Breadcrumbs from '../../../components/Breadcrumbs';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById, cancelOrder, modifyOrder, requestReturn, shareOrder, getInvoiceData, updateOrderStatus } = useOrder();
  const { addToCart } = useCart();
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemsForReturn, setSelectedItemsForReturn] = useState([]);
  const [returnReason, setReturnReason] = useState('');

  const order = getOrderById(params.id);

  if (!order) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8">The order you're looking for doesn't exist.</p>
            <Link
              href="/orders"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const handleReorder = () => {
    order.items.forEach(item => {
      addToCart(item, item.quantity || 1);
    });
    router.push('/cart');
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(order.id);
      alert('Order cancelled successfully!');
    }
  };

  const handleModify = (modifications) => {
    modifyOrder(order.id, modifications);
    setShowModifyModal(false);
    alert('Order modified successfully!');
  };

  const handleRequestReturn = () => {
    if (selectedItemsForReturn.length === 0) {
      alert('Please select items to return');
      return;
    }
    if (!returnReason.trim()) {
      alert('Please provide a reason for return');
      return;
    }
    requestReturn(order.id, selectedItemsForReturn, returnReason);
    setShowReturnModal(false);
    setSelectedItemsForReturn([]);
    setReturnReason('');
    alert('Return request submitted successfully!');
  };

  const handleDownloadInvoice = () => {
    const invoiceData = getInvoiceData(order.id);
    if (!invoiceData) {
      alert('Invoice data not found');
      return;
    }

    const invoiceText = `
INVOICE
Invoice Number: ${invoiceData.invoiceNumber}
Order ID: ${invoiceData.orderId}
Date: ${new Date(invoiceData.date).toLocaleDateString()}

Items:
${invoiceData.items.map(item => `  ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`).join('\n')}

Subtotal: ₹${invoiceData.subtotal}
Shipping: ₹${invoiceData.shipping}
Total: ₹${invoiceData.total}

Shipping Address:
${invoiceData.address?.fullName || ''}
${invoiceData.address?.address || ''}
${invoiceData.address?.city || ''}, ${invoiceData.address?.state || ''}
${invoiceData.address?.postalCode || ''}

Payment Method: ${invoiceData.paymentMethod === 'cod' ? 'Cash on Delivery' : invoiceData.paymentMethod}
    `.trim();

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceData.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Orders', href: '/orders' },
          { label: order.id, href: `/orders/${order.id}` },
        ]} />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 px-4 md:px-0">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
              Order {order.id}
            </h1>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReorder}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
            >
              Reorder
            </button>
            {order.canModify && (
              <button
                onClick={() => setShowModifyModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Modify Order
              </button>
            )}
            {order.canCancel && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Cancel Order
              </button>
            )}
            <button
              onClick={() => shareOrder(order.id)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
            >
              Share
            </button>
            <button
              onClick={handleDownloadInvoice}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
            >
              Download Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-0">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id || item.cartItemKey} className="flex gap-4 border-b border-gray-200 pb-4 last:border-0">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                      <Image
                        src={item.image || '/images/dummy.png'}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">Quantity: {item.quantity}</p>
                      <p className="text-lg font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking */}
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Tracking</h2>
              
              {/* Map Visualization (Placeholder) */}
              {order.status === 'shipped' && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Delivery Route</p>
                  <div className="relative h-48 bg-gradient-to-r from-blue-100 via-green-100 to-blue-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-gray-600">Package in transit</p>
                        <p className="text-xs text-gray-500 mt-1">Estimated arrival: {new Date(order.tracking.estimatedDelivery).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {/* Route markers */}
                    <div className="absolute top-4 left-4 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    <div className="absolute bottom-4 right-4 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    📍 Origin → Destination (Map integration ready for production)
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {order.tracking.history.map((track, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                      }`} />
                      {index < order.tracking.history.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-800 capitalize">{track.status}</p>
                      <p className="text-sm text-gray-500">{track.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(track.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Estimated Delivery:</strong>{' '}
                  {new Date(order.tracking.estimatedDelivery).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Returns */}
            {order.returns && order.returns.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Return Requests</h2>
                <div className="space-y-3">
                  {order.returns.map((ret) => (
                    <div key={ret.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          ret.status === 'approved' ? 'bg-green-100 text-green-800' :
                          ret.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(ret.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1"><strong>Reason:</strong> {ret.reason}</p>
                      <p className="text-xs text-gray-500">Items: {ret.itemIds.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Return Button */}
            {order.status === 'delivered' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Request Return/Refund
              </button>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{order.subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping:</span>
                  <span className="font-semibold">₹{order.shipping.toFixed(0)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span>₹{order.total.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Shipping Address</h3>
                  <p className="text-sm text-gray-600">
                    {order.shippingAddress?.fullName}<br />
                    {order.shippingAddress?.address}<br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state}<br />
                    {order.shippingAddress?.postalCode}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Modify Order Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Modify Order</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can only modify orders that are in "Confirmed" status. Changes will be reviewed.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Example: Remove first item
                  if (order.items.length > 1) {
                    handleModify({ remove: [order.items[0].id || order.items[0].cartItemKey] });
                  } else {
                    alert('Cannot remove all items. Please cancel the order instead.');
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Remove First Item (Demo)
              </button>
              <button
                onClick={() => setShowModifyModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Request Return/Refund</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Items</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {order.items.map((item) => (
                    <label key={item.id || item.cartItemKey} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItemsForReturn.includes(item.id || item.cartItemKey)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemsForReturn([...selectedItemsForReturn, item.id || item.cartItemKey]);
                          } else {
                            setSelectedItemsForReturn(selectedItemsForReturn.filter(id => id !== (item.id || item.cartItemKey)));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Please provide a reason for return..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRequestReturn}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedItemsForReturn([]);
                    setReturnReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

