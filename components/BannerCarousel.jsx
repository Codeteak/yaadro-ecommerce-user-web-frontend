'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function BannerCarousel({ banners = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Default banners if none provided
  const defaultBanners = [
    {
      id: 1,
      image: '/banner/1.png',
      title: 'Fresh Groceries',
      subtitle: 'Shop the freshest produce',
      link: '/products',
    },
    {
      id: 2,
      image: '/banner/2.jpg',
      title: 'Fresh Groceries',
      subtitle: 'Shop the produce',
      link: '/products',
    },
  ];

  const bannerList = banners.length > 0 ? banners : defaultBanners;

  // Auto-slide functionality
  useEffect(() => {
    if (bannerList.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerList.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [bannerList.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? bannerList.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === bannerList.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (bannerList.length === 0) return null;

  return (
    <section className="relative w-full max-w-full overflow-hidden bg-gray-100">
      <div className="relative h-48 md:h-64 lg:h-80 xl:h-96 w-full">
        {bannerList.map((banner, index) => (
          <Link
            key={banner.id || index}
            href={banner.link || '#'}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className="relative w-full h-full">
              <Image
                src={banner.image}
                alt={banner.title || 'Banner'}
                fill
                className="object-cover"
                priority={index === currentIndex}
                sizes="100vw"
              />
              {/* Overlay with text (optional) */}
              {(banner.title || banner.subtitle) && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    {banner.title && (
                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2">
                        {banner.title}
                      </h2>
                    )}
                    {banner.subtitle && (
                      <p className="text-lg md:text-xl lg:text-2xl">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}

        {/* Navigation Arrows */}
        {bannerList.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 md:p-3 transition-all shadow-lg"
              aria-label="Previous banner"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 md:p-3 transition-all shadow-lg"
              aria-label="Next banner"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {bannerList.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {bannerList.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


