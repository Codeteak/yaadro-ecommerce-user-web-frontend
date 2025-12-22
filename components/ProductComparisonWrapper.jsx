'use client';

import { useState } from 'react';
import { useProductComparison } from '../context/ProductComparisonContext';
import ProductComparison from './ProductComparison';

export default function ProductComparisonWrapper() {
  const { comparisonList } = useProductComparison();
  const [isOpen, setIsOpen] = useState(false);

  if (comparisonList.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 md:bottom-6 bg-blue-600 text-white rounded-full w-14 h-14 shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center"
        aria-label="Compare products"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        {comparisonList.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {comparisonList.length}
          </span>
        )}
      </button>
      <ProductComparison isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}


