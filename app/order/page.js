'use client';

import { useSearchParams } from 'next/navigation';
import OrderDetailClient from '../orders/[id]/OrderDetailClient';

export default function OrderPage() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || '';
  const trimmed = String(id).trim();

  if (!trimmed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Missing order id.
      </div>
    );
  }

  return <OrderDetailClient orderId={trimmed} />;
}

