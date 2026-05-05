'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCategories, useProducts } from '../hooks/useProducts';
import { useAlert } from '../context/AlertContext';
import ProductCarousel from '../components/ProductCarousel';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Container from '../components/Container';

export default function Home() {
  const [email, setEmail] = useState('');
  
  const { showAlert } = useAlert();
  const categoryScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Load categories and products using TanStack Query
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: featuredData, isLoading: featuredLoading } = useProducts({
    limit: 8,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const { data: bestSellersData, isLoading: bestSellersLoading } = useProducts({
    limit: 16,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const { data: newArrivalsData, isLoading: newArrivalsLoading } = useProducts({
    limit: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const { data: offersData, isLoading: offersLoading } = useProducts({
    limit: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Process data
  // Home categories strip: show only parent categories (parentId == null).
  const categories = categoriesData?.filter(cat => cat.isActive && cat.parentId == null).slice(0, 12) || [];
  const featuredProducts = featuredData?.products?.filter(p => p.isFeatured).slice(0, 8) || [];
  const bestSellers = bestSellersData?.products?.slice(0, 16) || [];
  const newArrivals = newArrivalsData?.products?.slice(0, 24) || [];
  const specialOffers = offersData?.products
    ?.filter(p => p.discountPercentage > 0 || (p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price)))
    .slice(0, 8) || [];

  const loading = categoriesLoading || featuredLoading || bestSellersLoading || newArrivalsLoading || offersLoading;

  const handleCategoryMouseDown = (e) => {
    if (!categoryScrollRef.current) return;
    if (e.pointerType === 'touch') return;
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
    const walk = (x - startXRef.current) * 1.2;
    categoryScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };
  
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    showAlert('Thank you for subscribing!', 'Success', 'success');
    setEmail('');
  };

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden min-h-screen" aria-busy="true" aria-live="polite">
        {/* Banner skeleton - top */}
        <section className="w-full bg-gray-100">
          <div className="w-full aspect-[2.5/1] max-h-44 md:max-h-52 rounded-none md:rounded-b-2xl bg-gray-200 animate-pulse" />
        </section>

        {/* Header: categories skeleton */}
        <section className="bg-white border-b border-gray-100 py-3 md:py-4">
          <Container>
            <div className="flex items-center gap-3 overflow-x-hidden px-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="h-2 w-12 sm:w-14 rounded bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Product card skeletons - 100vh height */}
        <section className="bg-white py-4 md:py-6 min-h-[calc(100vh-14rem)] md:min-h-[calc(100vh-7rem)]">
          <Container>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 flex-shrink-0">
                  <div className="w-full aspect-[4/5] max-h-[140px] rounded-2xl bg-gray-200 animate-pulse" />
                  <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse mt-1" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full" style={{ maxWidth: '100vw' }}>
      {/* Categories - horizontal scroll */}
      <section className="py-5 md:py-7 lg:py-9 bg-white overflow-visible">
        <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 mx-auto max-w-screen-xl overflow-visible">
          <div
            ref={categoryScrollRef}
            role="region"
            aria-label="Categories"
            onPointerDown={handleCategoryMouseDown}
            onPointerLeave={handleCategoryMouseLeave}
            onPointerUp={handleCategoryMouseUp}
            onPointerMove={handleCategoryMouseMove}
            onPointerCancel={handleCategoryMouseUp}
            className="category-scroll-track flex items-center gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide px-1 cursor-grab select-none touch-pan-x snap-x snap-mandatory scroll-smooth min-w-0 w-full"
            style={{
              WebkitOverflowScrolling: 'touch',
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            <div className="flex items-stretch gap-4 flex-nowrap w-max flex-shrink-0 py-1">
              {categories.map((category) => (
                <div key={category.id} className="flex-shrink-0 snap-start">
                  <CategoryCard category={category} />
                </div>
              ))}
            </div>
          </div>
        </div>
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
              <Link href="/products" className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={bestSellers.slice(0, 8)} cardVariant="flat" />
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
              <Link href="/products" className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={specialOffers.slice(0, 8)} cardVariant="flat" />
          </Container>
        </section>
      )}

      {/* Featured Products Grid (8 items) */}
      {featuredProducts.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16">
          <Container>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Featured Products</h2>
              <Link href="/products" className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base">
                Show More
              </Link>
            </div>
            <ProductGrid products={featuredProducts.slice(0, 8)} cardVariant="flat" />
          </Container>
        </section>
      )}

      {/* New Arrivals Section */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16 bg-gray-50">
          <Container>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">New Arrivals</h2>
              <Link href="/products" className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base">
                See All
              </Link>
            </div>
            <ProductGrid products={newArrivals.slice(0, 8)} cardVariant="flat" />
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
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg text-base md:text-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              View All Products
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
