'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

const SWIPE_COMMIT_RATIO = 0.18;
const SWIPE_VELOCITY_PX_MS = 0.35;
const DRAG_CLICK_THRESHOLD_PX = 8;

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
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const activePointerIdRef = useRef(null);
  const didSwipeRef = useRef(false);
  const autoTimerRef = useRef(null);

  const bannerList =
    banners.length > 0 ? banners : fallbackToDefaults ? DEFAULT_BANNERS : [];

  const slideCount = bannerList.length;
  const canSwipe = slideCount > 1;

  useEffect(() => {
    setCurrentIndex(0);
    setDragOffsetPx(0);
  }, [bannerList.length, bannerList[0]?.image]);

  const goToSlide = useCallback((index) => {
    if (slideCount === 0) return;
    const next = ((index % slideCount) + slideCount) % slideCount;
    setCurrentIndex(next);
  }, [slideCount]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slideCount - 1 : prev - 1));
  }, [slideCount]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === slideCount - 1 ? 0 : prev + 1));
  }, [slideCount]);

  const resetAutoAdvance = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (slideCount <= 1) return;

    autoTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev === slideCount - 1 ? 0 : prev + 1));
    }, 5000);
  }, [slideCount]);

  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [resetAutoAdvance, slideCount]);

  const finishDrag = useCallback(
    (clientX) => {
      const width = viewportRef.current?.offsetWidth || 1;
      const delta = clientX - dragStartXRef.current;
      const elapsed = Math.max(Date.now() - dragStartTimeRef.current, 1);
      const velocity = delta / elapsed;
      const commitByDistance = Math.abs(delta) > width * SWIPE_COMMIT_RATIO;
      const commitByVelocity = Math.abs(velocity) > SWIPE_VELOCITY_PX_MS;

      if (commitByDistance || commitByVelocity) {
        if (delta < 0) goToNext();
        else goToPrevious();
      }

      setDragOffsetPx(0);
      setIsDragging(false);
      activePointerIdRef.current = null;
      resetAutoAdvance();
    },
    [goToNext, goToPrevious, resetAutoAdvance]
  );

  const onPointerDown = (e) => {
    if (!canSwipe || e.button !== 0) return;
    didSwipeRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = Date.now();
    activePointerIdRef.current = e.pointerId;
    setIsDragging(true);
    setDragOffsetPx(0);
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;
    const delta = e.clientX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_CLICK_THRESHOLD_PX) {
      didSwipeRef.current = true;
    }
    const width = viewportRef.current?.offsetWidth || 1;
    const maxDrag = width * 0.45;
    const resisted =
      delta < 0
        ? Math.max(delta, -maxDrag)
        : Math.min(delta, maxDrag);
    setDragOffsetPx(resisted);
  };

  const onPointerUp = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    finishDrag(e.clientX);
  };

  const onPointerCancel = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    setDragOffsetPx(0);
    setIsDragging(false);
    activePointerIdRef.current = null;
    resetAutoAdvance();
  };

  const blockClickAfterSwipe = (e) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipeRef.current = false;
    }
  };

  const goToPreviousClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goToPrevious();
    resetAutoAdvance();
  };

  const goToNextClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    goToNext();
    resetAutoAdvance();
  };

  if (bannerList.length === 0) return null;

  const trackStyle = {
    transform: `translate3d(calc(-${currentIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
    transition: isDragging
      ? 'none'
      : 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };

  const slideContent = (banner, index) => (
    <div className="relative h-full w-full">
      <Image
        src={banner.image}
        alt={banner.title || 'Promotional banner'}
        fill
        className={`${imageClassName} pointer-events-none select-none`}
        priority={index === 0}
        sizes="100vw"
        unoptimized
        draggable={false}
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="px-4 text-center text-white">
            {banner.title && (
              <h2 className="mb-2 text-xl font-bold sm:text-2xl md:text-4xl lg:text-5xl">
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
    <section
      className={`relative w-full max-w-full overflow-hidden bg-gray-100 ${className}`.trim()}
    >
      <div
        ref={viewportRef}
        className={`relative h-44 w-full touch-pan-y sm:h-52 md:h-64 lg:h-72 ${
          canSwipe ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onPointerDown={canSwipe ? onPointerDown : undefined}
        onPointerMove={canSwipe ? onPointerMove : undefined}
        onPointerUp={canSwipe ? onPointerUp : undefined}
        onPointerCancel={canSwipe ? onPointerCancel : undefined}
        role={canSwipe ? 'region' : undefined}
        aria-roledescription={canSwipe ? 'carousel' : undefined}
        aria-label={canSwipe ? 'Promotional banners' : undefined}
      >
        <div className="flex h-full w-full" style={trackStyle}>
          {bannerList.map((banner, index) => {
            const key = banner.id ?? banner.image ?? index;
            const slideClass =
              'relative h-full w-full min-w-full flex-shrink-0 flex-grow-0 basis-full';

            if (banner.link) {
              return (
                <Link
                  key={key}
                  href={banner.link}
                  className={slideClass}
                  onClick={blockClickAfterSwipe}
                  draggable={false}
                >
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
        </div>

        {canSwipe && (
          <>
            <button
              type="button"
              onClick={goToPreviousClick}
              className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all hover:bg-white sm:flex md:p-2.5"
              aria-label="Previous banner"
            >
              <svg
                className="h-5 w-5 text-gray-800 md:h-6 md:w-6"
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
              onClick={goToNextClick}
              className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all hover:bg-white sm:flex md:p-2.5"
              aria-label="Next banner"
            >
              <svg
                className="h-5 w-5 text-gray-800 md:h-6 md:w-6"
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

        {canSwipe && (
          <div
            className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {bannerList.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  goToSlide(index);
                  resetAutoAdvance();
                }}
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

      {canSwipe && (
        <div className="sr-only" aria-live="polite">
          Banner {currentIndex + 1} of {slideCount}
        </div>
      )}
    </section>
  );
}
