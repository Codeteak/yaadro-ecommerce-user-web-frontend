'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { products } from '../data/products';
import ProductCarousel from '../components/ProductCarousel';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Container from '../components/Container';

// Get products for different sections
const featuredProducts = products.slice(0, 8);
const bestSellers = products.slice(8, 16);
const newArrivals = products.slice(16, 24);
const specialOffers = products.filter(p => p.price < 200).slice(0, 8);

// Categories list
const categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat & Seafood', 'Bakery', 'Beverages', 'Snacks', 'Pantry', 'Frozen', 'Baby Care', 'Personal Care', 'Cleaning', 'Home & Kitchen', 'Health & Wellness', 'Spices & Condiments'];

export default function Home() {
  const [email, setEmail] = useState('');
  const categoryScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleCategoryMouseDown = (e) => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = true;
    categoryScrollRef.current.classList.add('cursor-grabbing');
    startXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
    scrollLeftRef.current = categoryScrollRef.current.scrollLeft;
  };

  const handleCategoryMouseLeave = () => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = false;
    categoryScrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleCategoryMouseUp = () => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = false;
    categoryScrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleCategoryMouseMove = (e) => {
    if (!isDraggingRef.current || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.2; // sensitivity
    categoryScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    alert('Thank you for subscribing!');
    setEmail('');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>

      {/* Categories - horizontal scroll */}
      <section className="py-6 md:py-8 lg:py-10 bg-white">
        <Container>
          <div
            ref={categoryScrollRef}
            onMouseDown={handleCategoryMouseDown}
            onMouseLeave={handleCategoryMouseLeave}
            onMouseUp={handleCategoryMouseUp}
            onMouseMove={handleCategoryMouseMove}
            className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-1 cursor-grab select-none"
          >
            {categories.map((category) => (
              <div key={category} className="flex-shrink-0">
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        </Container>
      </section>
      {/* Promo Banners Placeholder */}
      <section className="py-6 bg-white">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { src: '/banner/3.png', alt: 'Promo Banner 1' },
              { src: '/banner/4.png', alt: 'Promo Banner 2' },
            ].map((banner, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden min-h-[240px] md:min-h-[280px] bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 shadow-sm"
              >
                <Image
                  src={banner.src}
                  alt={banner.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16">
          <Container>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Best Sellers</h2>
              <Link href="/products" className="text-blue-600 hover:text-blue-800 font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={bestSellers.slice(0, 8)} />
          </Container>
        </section>
      )}

      {/* Special Offers Section */}
      {specialOffers.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16 bg-red-50">
          <Container>
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Special Offers</h2>
                <p className="text-gray-600 mt-1">Limited time deals you don't want to miss</p>
              </div>
              <Link href="/products" className="text-blue-600 hover:text-blue-800 font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={specialOffers.slice(0, 8)} />
          </Container>
        </section>
      )}

      {/* Featured Products Grid (8 items) */}
      <section className="py-8 md:py-12 lg:py-16">
        <Container>
          <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Featured Products</h2>
            <Link href="/products" className="text-blue-600 hover:text-blue-800 font-semibold text-sm md:text-base">
              Show More
            </Link>
          </div>
          <ProductGrid products={featuredProducts.slice(0, 8)} />
        </Container>
      </section>

      {/* New Arrivals Section */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16 bg-gray-50">
          <Container>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">New Arrivals</h2>
              <Link href="/products" className="text-blue-600 hover:text-blue-800 font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={newArrivals.slice(0, 8)} />
          </Container>
        </section>
      )}


      {/* View All Products CTA */}
      <section className="py-8 md:py-12 lg:py-16 bg-gray-50">
        <Container>
          <div className="text-center px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Explore Our Full Catalog</h2>
            <p className="text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto">
              Discover thousands of products across all categories. Fresh, quality, and delivered to your doorstep.
            </p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-base md:text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

