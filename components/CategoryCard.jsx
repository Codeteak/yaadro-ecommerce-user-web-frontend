'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getProductsByCategory } from '../data/products';

export default function CategoryCard({ category }) {
  // Get first product from category to use its image
  const categoryProducts = getProductsByCategory(category);
  const categoryImage = categoryProducts.length > 0 ? categoryProducts[0].image : 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&h=500&fit=crop';

  return (
    <Link href={`/products?category=${encodeURIComponent(category)}`} className="flex flex-col items-center gap-2">
      <div className="bg-gray-100 rounded-2xl p-2  transition-all duration-200 w-32 h-32 sm:w-22 sm:h-22 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src={categoryImage}
            alt={category}
            fill
            className="object-contain p-2.5 rounded-2xl group-hover:scale-105 transition-transform duration-300"
            sizes="64px"
          />
        </div>
      </div>
      <h3 className="text-[12px] sm:text-sm font-semibold text-gray-800 text-center leading-tight">
        {category}
      </h3>
    </Link>
  );
}

