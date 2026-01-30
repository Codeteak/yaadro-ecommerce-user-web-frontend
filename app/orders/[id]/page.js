'use client';

import { useState, Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useOrderDetail, useCancelOrder, useRetryPayment, useVerifyPayment } from '../../../hooks/useOrders';
import { useProductWithRelated } from '../../../hooks/useProducts';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import Container from '../../../components/Container';
import Breadcrumbs from '../../../components/Breadcrumbs';
import ConfirmModal from '../../../components/ConfirmModal';
import PromptModal from '../../../components/PromptModal';
import PageTopBar from '../../../components/PageTopBar';
import ProductCarousel from '../../../components/ProductCarousel';
import { Ban, Repeat2 } from 'lucide-react';

function OrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrderDetail(params.id);
  const cancelOrderMutation = useCancelOrder();
  const retryPaymentMutation = useRetryPayment();
  const verifyPaymentMutation = useVerifyPayment();
  const { addToCart, clearCart } = useCart();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemsForReturn, setSelectedItemsForReturn] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Related items hook MUST be called unconditionally (avoid conditional hooks).
  const seedProductId = order?.items?.[0]?.productId || order?.items?.[0]?.product?.id || null;
  const { data: relatedData } = useProductWithRelated(seedProductId);
  const orderedIds = new Set((order?.items || []).map((it) => it.productId || it.product?.id).filter(Boolean));
  const relatedProducts = (relatedData?.relatedProducts || []).filter((p) => p?.id && !orderedIds.has(p.id)).slice(0, 12);

  // Initialize Razorpay - MUST be before any conditional returns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Suppress harmless "unsafe header" warnings from Razorpay SDK
      const originalWarn = console.warn;
      console.warn = function(...args) {
        const message = args[0]?.toString() || '';
        if (message.includes('unsafe header') || message.includes('x-rtb-fingerprint-id')) {
          return;
        }
        originalWarn.apply(console, args);
      };

      if (window.Razorpay) {
        setRazorpayLoaded(true);
      }

      return () => {
        console.warn = originalWarn;
      };
    }
  }, []);

  if (isLoading) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading order details...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8">
              {error?.message || "The order you're looking for doesn't exist."}
            </p>
            <Link
              href="/orders"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
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
      const product = {
        id: item.productId,
        name: item.productName,
        price: item.unitPrice,
        image: item.product?.images?.[0] || item.image || '/images/dummy.png',
      };
      addToCart(product, item.quantity || 1);
    });
    router.push('/cart');
  };

  const handleCancel = () => {
    setShowCancelPrompt(true);
  };

  const handleCancelReasonSubmit = (reason) => {
    setCancelReason(reason);
    setShowCancelPrompt(false);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelOrderMutation.mutateAsync({ orderId: order.id, reason: cancelReason });
      showAlert('Order cancelled successfully!', 'Success', 'success');
      setCancelReason('');
    } catch (error) {
      showAlert(error.message || 'Failed to cancel order. Please try again.', 'Error', 'error');
    }
  };

  const handleRequestReturn = () => {
    if (selectedItemsForReturn.length === 0) {
      showAlert('Please select items to return', 'Required', 'warning');
      return;
    }
    if (!returnReason.trim()) {
      showAlert('Please provide a reason for return', 'Required', 'warning');
      return;
    }
    // Note: Return request functionality would need backend API support
    setShowReturnModal(false);
    setSelectedItemsForReturn([]);
    setReturnReason('');
    showAlert('Return request feature coming soon!', 'Coming Soon', 'info');
  };

  const handleDownloadInvoice = () => {
    const invoiceText = `
INVOICE
Invoice Number: ${order.orderNumber || order.id}
Order ID: ${order.id}
Date: ${new Date(order.createdAt).toLocaleDateString()}

Items:
${order.items.map(item => `  ${item.productName || item.name} x${item.quantity} - ₹${item.totalPrice.toFixed(2)}`).join('\n')}

Subtotal: ₹${order.subtotal.toFixed(2)}
Tax: ₹${order.tax.toFixed(2)}
Shipping: ₹${order.shipping.toFixed(2)}
Discount: ₹${order.discount.toFixed(2)}
Total: ₹${order.total.toFixed(2)}

Shipping Address:
${order.deliveryAddress?.street || ''}
${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}
${order.deliveryAddress?.zipCode || ''}
${order.deliveryAddress?.country || ''}

Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
Payment Status: ${order.paymentStatus}
    `.trim();

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderNumber || order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Check if payment can be retried
  const canRetryPayment = order && 
    ['pending', 'failed'].includes(order.paymentStatus?.toLowerCase()) && 
    order.paymentMethod !== 'cod';

  const handleRetryPayment = async () => {
    if (!order) return;

    setIsRetryingPayment(true);

    try {
      // Call retry payment API
      const orderResponse = await retryPaymentMutation.mutateAsync({
        orderId: order.id,
        paymentMethod: null, // Use existing payment method
      });

      if (!orderResponse?.payment?.razorpay) {
        showAlert('Payment initialization failed. Please try again.', 'Error', 'error');
        setIsRetryingPayment(false);
        return;
      }

      // Initialize Razorpay payment
      await handleRazorpayPayment(orderResponse, order);
    } catch (error) {
      console.error('Error retrying payment:', error);
      showAlert(error.message || 'Failed to retry payment. Please try again.', 'Error', 'error');
      setIsRetryingPayment(false);
    }
  };

  const handleRazorpayPayment = async (orderResponse, orderData) => {
    if (!window.Razorpay) {
      showAlert('Razorpay SDK not loaded. Please refresh the page.', 'Error', 'error');
      setIsRetryingPayment(false);
      return;
    }

    const { order, payment } = orderResponse;
    const rzpData = payment?.razorpay;

    if (!rzpData) {
      showAlert('Payment initialization failed. Please try again.', 'Error', 'error');
      setIsRetryingPayment(false);
      return;
    }

    // Validate required Razorpay data
    if (!rzpData.keyId || !rzpData.razorpayOrderId || !rzpData.amount) {
      console.error('Invalid Razorpay data:', rzpData);
      showAlert('Invalid payment configuration. Please contact support.', 'Error', 'error');
      setIsRetryingPayment(false);
      return;
    }

    const options = {
      key: rzpData.keyId,
      amount: rzpData.amount, // Already in paise
      currency: rzpData.currency || 'INR',
      order_id: rzpData.razorpayOrderId,
      name: 'Yaadro',
      description: `Order ${order.orderNumber || orderData.orderNumber}`,
      handler: async function (paymentResponse) {
        try {
          // Verify payment with backend
          await verifyPaymentMutation.mutateAsync({
            orderId: order.id || orderData.id,
            paymentData: {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            },
          });

          // Redirect to success page
          router.push(`/order-success?orderId=${order.id || orderData.id}&payment=success`);
        } catch (error) {
          console.error('Payment verification failed:', error);
          showAlert('Payment verification failed. Please contact support with order ID: ' + (order.orderNumber || orderData.orderNumber), 'Payment Failed', 'error');
          router.push(`/order-success?orderId=${order.id || orderData.id}&payment=failed`);
        } finally {
          setIsRetryingPayment(false);
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#FF8D21', // primary
      },
      modal: {
        ondismiss: function() {
          console.log('Payment cancelled');
          setIsRetryingPayment(false);
        },
      },
      notes: {
        order_id: order.id || orderData.id,
        order_number: order.orderNumber || orderData.orderNumber,
        retry: 'true',
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setIsRetryingPayment(false);
        showAlert('Payment failed: ' + (response.error.description || 'Please try again'), 'Payment Failed', 'error');
      });
      rzp.open();
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      showAlert('Failed to open payment gateway. Please try again.', 'Error', 'error');
      setIsRetryingPayment(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-primary/20 text-primary-dark',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (paymentStatus) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[paymentStatus?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
      {/* Load Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => console.error('Failed to load Razorpay SDK')}
      />
      
      <PageTopBar title="Order Details" subtitle={order?.id || params?.id} fallbackHref="/orders" />
      <Container>
        <div className="hidden md:block">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Orders', href: '/orders' },
            { label: order.id, href: `/orders/${order.id}` },
          ]} />
        </div>
        
        {/* Payment Failed/Pending Alert */}
        {canRetryPayment && (
          <div className="mb-4 px-4 md:px-0">
            <div className={`p-4 border-b border-gray-200 ${
              order.paymentStatus === 'failed' 
                ? 'bg-red-50' 
                : 'bg-yellow-50'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  order.paymentStatus === 'failed' 
                    ? 'bg-red-100' 
                    : 'bg-yellow-100'
                }`}>
                  {order.paymentStatus === 'failed' ? (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    order.paymentStatus === 'failed' 
                      ? 'text-red-800' 
                      : 'text-yellow-800'
                  }`}>
                    Payment {order.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                  </h3>
                  <p className={`text-sm mb-3 ${
                    order.paymentStatus === 'failed' 
                      ? 'text-red-700' 
                      : 'text-yellow-700'
                  }`}>
                    {order.paymentStatus === 'failed' 
                      ? 'Your payment could not be processed. Please retry payment to confirm your order.'
                      : 'Your payment is pending. Please complete the payment to confirm your order.'}
                  </p>
                  <button
                    onClick={handleRetryPayment}
                    disabled={isRetryingPayment || retryPaymentMutation.isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isRetryingPayment || retryPaymentMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Payment Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Status Timeline (FIRST) */}
        <div className="px-4 md:px-0 py-4 border-b border-gray-200">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">Order Status</h2>
          <div className="space-y-6">
    {[
      { 
        status: 'pending', 
        label: 'Order Placed', 
        date: order.createdAt,
      },
      { 
        status: 'confirmed', 
        label: 'Order Confirmed', 
        date: order.createdAt,
      },
      { 
        status: 'processing', 
        label: 'Processing', 
        date: order.updatedAt,
      },
      { 
        status: 'shipped', 
        label: 'Shipped', 
        date: order.updatedAt,
      },
      { 
        status: 'delivered', 
        label: 'Delivered', 
        date: order.deliveredAt,
      },
    ].filter((step, index, arr) => {
      const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
      const currentIndex = statusOrder.indexOf(order.status);
      return index <= currentIndex;
    }).map((step, index, arr) => {
      const isLast = index === arr.length - 1;
      const isCompleted = index < arr.length - 1;
      
      return (
        <div key={step.status} className="flex items-start gap-3">
          {/* Date Column */}
          <div className="w-16 flex-shrink-0">
            <p className="text-xs text-gray-800 font-medium">
              {step.date ? new Date(step.date).toLocaleDateString('en-US', { 
                day: '2-digit', 
                month: 'short' 
              }) : '--'}
            </p>
            <p className="text-[10px] text-gray-400">
              {step.date ? new Date(step.date).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              }) : '--'}
            </p>
          </div>

          {/* Timeline Icon & Line */}
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center
              ${isLast ? 'bg-primary' : isCompleted ? 'bg-purple-600' : 'bg-gray-400'}
            `} />
            
            {index < arr.length - 1 && (
              <div className={`w-0.5 h-12 
                ${isCompleted ? 'bg-purple-600' : 'bg-gray-300'}
              `} />
            )}
          </div>

          {/* Status Details */}
          <div className="flex-1 -mt-0.5">
            <p className={`text-sm font-semibold capitalize
              ${isLast ? 'text-primary-dark' : 'text-gray-800'}
            `}>
              {step.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {step.date ? 'Completed' : 'Pending'}
            </p>
          </div>
        </div>
      );
    })}
          </div>

          {/* Request Return Button */}
          {order.status === 'delivered' && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="mt-4 w-full px-4 py-3 bg-orange-600 text-white rounded-xl font-extrabold hover:bg-orange-700 transition-colors"
            >
              Request Return/Refund
            </button>
          )}
        </div>

        {/* Date + badges (BADGES UNDER DATE) */}
        <div className="px-4 md:px-0 py-4 border-b border-gray-200">
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Placed on:</span>{' '}
            {new Date(order.createdAt).toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            {order.paymentStatus ? (
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${getPaymentStatusColor(order.paymentStatus)}`}>
                Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {canRetryPayment && (
              <button
                onClick={handleRetryPayment}
                disabled={isRetryingPayment || retryPaymentMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl font-extrabold hover:bg-primary-dark transition-colors text-sm disabled:opacity-50"
              >
                {isRetryingPayment || retryPaymentMutation.isPending ? 'Processing…' : 'Retry Payment'}
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                onClick={handleDownloadInvoice}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-extrabold hover:bg-purple-700 transition-colors text-sm"
              >
                Download Invoice
              </button>
            )}
          </div>
        </div>

        {/* Items (AFTER DATE+BADGES) */}
        <div className="px-4 md:px-0 py-4 border-b border-gray-200">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                  <Image
                    src={item.product?.images?.[0] || item.image || '/images/dummy.png'}
                    alt={item.productName || item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-gray-900 truncate">{item.productName || item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    SKU: {item.productSku || 'N/A'} • Qty: {item.quantity}
                  </p>
                  <p className="text-base font-extrabold text-gray-900 mt-2">₹{item.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary (LAST, NO CARD STYLE) */}
        <div className="px-4 md:px-0 py-4">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">Order Summary</h2>

          <div className="space-y-2 text-sm text-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-extrabold">₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-extrabold">₹{order.tax.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-extrabold text-primary-dark">-₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-extrabold">₹{order.shipping.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-base">
              <span className="font-extrabold text-gray-900">Total</span>
              <span className="font-extrabold text-gray-900">₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Shipping Address</h3>
            {order.deliveryAddress && Object.keys(order.deliveryAddress).length > 0 ? (
              <div className="text-sm text-gray-700">
                {(order.deliveryAddress.fullName || order.deliveryAddress.name) && (
                  <p className="font-semibold mb-1">
                    {order.deliveryAddress.fullName || order.deliveryAddress.name}
                  </p>
                )}
                {(order.deliveryAddress.street || order.deliveryAddress.address) && (
                  <p className="mb-1">{order.deliveryAddress.street || order.deliveryAddress.address}</p>
                )}
                {(order.deliveryAddress.city || order.deliveryAddress.state) && (
                  <p className="mb-1">
                    {[order.deliveryAddress.city, order.deliveryAddress.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {(order.deliveryAddress.zipCode || order.deliveryAddress.postalCode || order.deliveryAddress.country) && (
                  <p className="mb-1">
                    {[order.deliveryAddress.zipCode || order.deliveryAddress.postalCode, order.deliveryAddress.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {order.deliveryAddress.phone && (
                  <p className="text-gray-500 mt-2">📞 {order.deliveryAddress.phone}</p>
                )}
                {order.deliveryAddress.landmark && (
                  <p className="text-gray-500 text-xs mt-1">📍 {order.deliveryAddress.landmark}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No shipping address available</div>
            )}
          </div>

          <div className="mt-5 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Payment Method</h3>
            <p className="text-sm text-gray-700 capitalize">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
            </p>
            {order.paymentStatus && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-extrabold ${getPaymentStatusColor(order.paymentStatus)}`}>
                  {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1) || 'Unknown'}
                </span>
              </div>
            )}
          </div>

          {/* Bottom actions (LAST) */}
          <div className="mt-6 border-t border-gray-200 pt-4 pb-2">
            <div className={`grid gap-3 ${order.canCancel ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {order.canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={cancelOrderMutation.isPending}
                  className="w-full px-4 py-4 bg-red-600 text-white rounded-2xl font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Ban className="w-5 h-5" />
                  {cancelOrderMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                </button>
              )}
              <button
                onClick={handleReorder}
                className="w-full px-4 py-4 bg-primary text-white rounded-2xl font-extrabold hover:bg-primary-dark transition-colors inline-flex items-center justify-center gap-2"
              >
                <Repeat2 className="w-5 h-5" />
                Reorder
              </button>
            </div>
          </div>

          {/* Related items (BOTTOM) */}
          {relatedProducts.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <ProductCarousel products={relatedProducts} title="Related items" showMoreLink="/products" />
            </div>
          )}
        </div>
      </Container>

      {/* Cancel Order Prompt Modal */}
      <PromptModal
        isOpen={showCancelPrompt}
        onClose={() => setShowCancelPrompt(false)}
        onSubmit={handleCancelReasonSubmit}
        title="Cancel Order"
        message="Please provide a reason for cancellation:"
        placeholder="Enter cancellation reason"
        submitText="Continue"
        cancelText="Cancel"
      />

      {/* Cancel Order Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setCancelReason('');
        }}
        onConfirm={handleCancelConfirm}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
      />

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
                    <label key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItemsForReturn.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemsForReturn([...selectedItemsForReturn, item.id]);
                          } else {
                            setSelectedItemsForReturn(selectedItemsForReturn.filter(id => id !== item.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{item.productName || item.name}</span>
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

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading order details...</p>
          </div>
        </Container>
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}

