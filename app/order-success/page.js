'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Container from '../../components/Container';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useOrder } from '../../context/OrderContext';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const { getOrderById } = useOrder();
  const orderId = searchParams?.get('orderId') || `ORD-${Date.now()}`;
  const order = getOrderById(orderId);

  return (
    <div className="py-8 md:py-12 lg:py-16 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Order Success', href: '/order-success' }]} />
        <div className="max-w-2xl mx-auto text-center px-4 mt-4">
          <div className="mb-6 md:mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 md:w-12 md:h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">Thank You!</h1>
            <p className="text-lg md:text-xl text-gray-600 mb-2">
              Your order has been placed successfully.
            </p>
            <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">
              Order ID: <span className="font-semibold text-gray-800 break-all">{orderId}</span>
            </p>
          </div>

          <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-6 md:mb-8">
            <p className="text-sm md:text-base text-gray-700 mb-4">
              We've received your order and will process it shortly. You will receive a confirmation email with your order details.
            </p>
            <p className="text-xs md:text-sm text-gray-500">
              Note: This is a demo application. No actual order has been placed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg text-sm md:text-base font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Back to Home
            </Link>
            {order && (
              <Link
                href={`/orders/${orderId}`}
                className="inline-block bg-gray-200 text-gray-800 px-6 md:px-8 py-2.5 md:py-3 rounded-lg text-sm md:text-base font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                View Order Details
              </Link>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

