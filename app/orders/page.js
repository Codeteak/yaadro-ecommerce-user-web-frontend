'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOrder } from '../../context/OrderContext';
import { useCart } from '../../context/CartContext';
import Container from '../../components/Container';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function OrdersPage() {
  const { orders, getFilteredOrders, cancelOrder, shareOrder, getInvoiceData } = useOrder();
  const { addToCart } = useCart();
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const filteredOrders = useMemo(() => {
    return getFilteredOrders(filters);
  }, [orders, filters, getFilteredOrders]);

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addToCart(item, item.quantity || 1);
    });
    alert('Items added to cart!');
  };

  const handleCancel = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(orderId);
      alert('Order cancelled successfully!');
    }
  };

  const handleDownloadInvoice = (orderId) => {
    const invoiceData = getInvoiceData(orderId);
    if (!invoiceData) {
      alert('Invoice data not found');
      return;
    }

    // Generate simple text invoice (in production, use a PDF library)
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
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Orders', href: '/orders' }]} />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          Order History
        </h1>

        {/* Filters */}
        <div className="px-4 md:px-0 mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search orders..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <button
              onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', search: '' })}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Orders List */}
        <div className="px-4 md:px-0 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500 text-lg mb-4">No orders found</p>
              <Link
                href="/products"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">Order {order.id}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} • ₹{order.total.toFixed(0)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                      View Details
                    </Link>
                    {order.canCancel && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleReorder(order)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                    >
                      Reorder
                    </button>
                    <button
                      onClick={() => shareOrder(order.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                    >
                      Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
    </div>
  );
}


