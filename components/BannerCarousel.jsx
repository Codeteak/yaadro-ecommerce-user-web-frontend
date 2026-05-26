'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const DEFAULT_BANNERS = [
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

/**
 * @param {object} props
 * @param {Array<{ id?: string|number, image: string, title?: string, subtitle?: string, link?: string }>} props.banners
 * @param {boolean} [props.fallbackToDefaults] - use static /banner assets when `banners` is empty
 * @param {string} [props.className] - wrapper class on outer section
 * @param {string} [props.imageClassName] - image object-fit class
 */
export default function BannerCarousel({
  banners = [],
  fallbackToDefaults = true,
  className = '',
  imageClassName = 'object-contain object-center',
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const bannerList =
    banners.length > 0 ? banners : fallbackToDefaults ? DEFAULT_BANNERS : [];

  useEffect(() => {
    setCurrentIndex(0);
  }, [bannerList.length, bannerList[0]?.image]);

  useEffect(() => {
    if (bannerList.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerList.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [bannerList.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? bannerList.length - 1 : prevIndex - 1
    );
  };

  const goToNext = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setCurrentIndex((prevIndex) =>
      prevIndex === bannerList.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (bannerList.length === 0) return null;

  const slideContent = (banner, index) => (
    <div className="relative w-full h-full">
      <Image
        src={banner.image}
        alt={banner.title || 'Promotional banner'}
        fill
        className={imageClassName}
        priority={index === currentIndex}
        sizes="100vw"
        unoptimized
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="text-center text-white px-4">
            {banner.title && (
              <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-2">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl">{banner.subtitle}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className={`relative w-full max-w-full overflow-hidden bg-gray-100 ${className}`.trim()}>
      <div className="relative h-44 sm:h-52 md:h-64 lg:h-72 w-full">
        {bannerList.map((banner, index) => {
          const slideClass = `absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`;
          const key = banner.id ?? banner.image ?? index;

          if (banner.link) {
            return (
              <Link key={key} href={banner.link} className={slideClass}>
                {slideContent(banner, index)}
              </Link>
            );
          }

          return (
            <div key={key} className={slideClass} aria-hidden={index !== currentIndex}>
              {slideContent(banner, index)}
            </div>
          );
        })}

        {bannerList.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 md:p-2.5 transition-all shadow-lg"
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
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 md:p-2.5 transition-all shadow-lg"
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

        {bannerList.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {bannerList.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
