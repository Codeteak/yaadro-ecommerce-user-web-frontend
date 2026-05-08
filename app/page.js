'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useProducts } from '../hooks/useProducts';
import { useAlert } from '../context/AlertContext';
import { useAddress } from '../context/AddressContext';
import { useLocationService } from '../context/LocationServiceContext';
import { useAuth } from '../context/AuthContext';
import ProductCarousel from '../components/ProductCarousel';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Container from '../components/Container';
import { User, MapPin, Search, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  
  const { showAlert } = useAlert();
  const { getDefaultAddress } = useAddress();
  const { isAuthenticated, user, setShowLoginSheet } = useAuth();
  const {
    isChecking: isLocationChecking,
    serviceable: isServiceable,
    distanceM,
    geoDenied: isGeoDenied,
    errorMessage: locationError,
    setShowServiceAreaSheet,
    recheckLocation,
  } = useLocationService();

  // Pull-to-refresh (mobile-like)
  const [ptrPull, setPtrPull] = useState(0); // px
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const ptrRef = useRef({ startY: 0, pulling: false });

  const ptrThreshold = 72;
  const ptrMax = 110;

  const beginRefresh = async () => {
    if (ptrRefreshing) return;
    setPtrRefreshing(true);
    setPtrPull(ptrThreshold);
    try {
      recheckLocation?.();
      await queryClient.invalidateQueries();
    } finally {
      // Small delay to make animation visible/stable
      window.setTimeout(() => {
        setPtrRefreshing(false);
        setPtrPull(0);
      }, 450);
    }
  };

  // Confetti popper when delivery area becomes serviceable.
  const [showDeliveryConfetti, setShowDeliveryConfetti] = useState(false);
  const didConfettiRef = useRef(false);
  useEffect(() => {
    if (didConfettiRef.current) return;
    if (isLocationChecking) return;
    if (isServiceable !== true) return;
    didConfettiRef.current = true;
    setShowDeliveryConfetti(true);
    const t = window.setTimeout(() => setShowDeliveryConfetti(false), 900);
    return () => window.clearTimeout(t);
  }, [isLocationChecking, isServiceable]);

  // ETA animation hooks must run on every render (before early returns).
  const computeEtaMinutes = (distMeters) => {
    const d = Number(distMeters);
    if (!Number.isFinite(d) || d <= 0) return null;
    const km = d / 1000;
    const baseMinutes = 4;
    const minutesPerKm = 3.2;
    const eta = Math.round(baseMinutes + km * minutesPerKm);
    return Math.max(5, Math.min(eta, 90));
  };
  const targetEtaMinutes = computeEtaMinutes(distanceM);
  const [animatedEta, setAnimatedEta] = useState(null);
  const etaAnimRef = useRef({ raf: 0 });

  useEffect(() => {
    if (!Number.isFinite(targetEtaMinutes)) {
      setAnimatedEta(null);
      return undefined;
    }

    const to = targetEtaMinutes;
    const from = Number.isFinite(animatedEta) ? animatedEta : Math.max(0, Math.min(10, to - 6));
    const durationMs = 650;
    const start = performance.now();

    if (etaAnimRef.current.raf) cancelAnimationFrame(etaAnimRef.current.raf);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const val = Math.round(from + (to - from) * eased);
      setAnimatedEta(val);
      if (t < 1) etaAnimRef.current.raf = requestAnimationFrame(tick);
    };

    etaAnimRef.current.raf = requestAnimationFrame(tick);
    return () => {
      if (etaAnimRef.current.raf) cancelAnimationFrame(etaAnimRef.current.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEtaMinutes]);

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

  // Fresh Zone category tabs
  const [freshZoneCategoryId, setFreshZoneCategoryId] = useState(null);
  // Order Again category tabs (uses newArrivals for now)
  const [orderAgainCategoryId, setOrderAgainCategoryId] = useState(null);

  const getCategoryImageSrc = (cat) =>
    cat?.image?.url ||
    cat?.imageUrl ||
    cat?.image_url ||
    cat?.photo?.url ||
    cat?.photoUrl ||
    cat?.photo_url ||
    cat?.icon?.url ||
    cat?.iconUrl ||
    cat?.icon_url ||
    null;

  const productMatchesCategory = (product, cat) => {
    if (!product || !cat) return true;
    const catId = cat?.id ?? cat?._id ?? null;
    const catName = (cat?.name || '').toString().trim().toLowerCase();

    const pidCatId =
      product?.categoryId ??
      product?.category_id ??
      product?.category?.id ??
      product?.category?._id ??
      null;
    if (catId != null && pidCatId != null && String(pidCatId) === String(catId)) return true;

    const pName =
      (product?.category?.name ?? product?.category ?? product?.categoryName ?? product?.category_name ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (catName && pName && pName === catName) return true;

    const pCats = Array.isArray(product?.categories) ? product.categories : null;
    if (catName && pCats?.some((c) => (c?.name ?? c)?.toString?.().trim?.().toLowerCase?.() === catName))
      return true;

    return false;
  };

  const freshZoneSelectedCategory =
    freshZoneCategoryId == null ? null : categories.find((c) => String(c.id) === String(freshZoneCategoryId)) || null;

  const freshZoneProducts = freshZoneSelectedCategory
    ? specialOffers.filter((p) => productMatchesCategory(p, freshZoneSelectedCategory))
    : specialOffers;

  const orderAgainSelectedCategory =
    orderAgainCategoryId == null
      ? null
      : categories.find((c) => String(c.id) === String(orderAgainCategoryId)) || null;

  const orderAgainProducts = orderAgainSelectedCategory
    ? newArrivals.filter((p) => productMatchesCategory(p, orderAgainSelectedCategory))
    : newArrivals;

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
        {/* Purple hero skeleton (matches current home style) */}
        <section
          className="w-full relative overflow-hidden"
          style={{
            background: '#902bf5',
            minHeight: '78vh',
            borderBottomLeftRadius: 44,
            borderBottomRightRadius: 44,
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          }}
        >
          {/* Background video */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <video
              className="h-full w-full object-cover object-bottom"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src="/create_a_animated_video_for_th.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Bottom shade */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-52 sm:h-64"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(0,0,0,0))',
            }}
            aria-hidden
          />

          <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
          <div className="relative min-h-[78vh] flex flex-col pt-6 md:pt-8 pb-20 sm:pb-24 overflow-hidden">
              {/* Top row skeleton */}
              <div className="relative z-20 flex items-start justify-between gap-3">
                <div className="inline-flex w-auto max-w-[78vw] sm:max-w-[520px] items-stretch rounded-2xl border border-white/15 bg-black/20 backdrop-blur px-3 py-2.5">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center text-white/80">
                    <div className="h-8 w-10 rounded-md bg-white/20 animate-pulse" />
                    <div className="mt-2 h-3 w-8 rounded bg-white/15 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1 pl-3">
                    <div className="h-6 w-40 rounded-full bg-white/15 animate-pulse" />
                    <div className="mt-2 h-4 w-52 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <div className="h-11 w-11 rounded-full border border-white/15 bg-black/20 backdrop-blur animate-pulse" />
                  <div className="h-11 w-11 rounded-full border border-white/15 bg-black/20 backdrop-blur animate-pulse" />
                </div>
              </div>

              {/* Tagline skeleton */}
              <div className="relative z-[9] mt-4 max-w-[92vw]">
                <div className="h-14 w-[min(520px,92vw)] rounded-xl bg-white/10 animate-pulse" />
                <div className="mt-3 h-14 w-[min(440px,84vw)] rounded-xl bg-white/10 animate-pulse" />
              </div>

              {/* Image skeleton */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
                <div className="w-[320px] h-[440px] sm:w-[380px] sm:h-[520px] rounded-[28px] bg-white/10 animate-pulse" />
              </div>

              {/* Category carousel skeleton */}
              <div className="relative z-20 mt-auto px-1">
                <div className="flex items-stretch gap-4 overflow-x-auto scrollbar-hide pb-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[110px] h-[96px] rounded-[18px] bg-white/15 border border-white/10 animate-pulse flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Product sections skeleton */}
        <section className="bg-white py-6">
          <Container>
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
              <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
              <div className="h-5 w-14 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8 gap-1 sm:gap-3 lg:gap-4 w-full max-w-full overflow-x-hidden">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="w-full aspect-[4/5] rounded-2xl bg-gray-200 animate-pulse" />
                  <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      </div>
    );
  }

  const defaultAddress = getDefaultAddress();
  const addressLine = defaultAddress
    ? [defaultAddress.city, defaultAddress.street || defaultAddress.address]
        .filter(Boolean)
        .slice(0, 2)
        .join(', ') || 'Add address'
    : 'Add address';

  const locationStatus = (() => {
    if (isLocationChecking) {
      return { label: 'Checking area…', tone: 'neutral' };
    }
    if (isGeoDenied) {
      return { label: 'Location off', tone: 'warn' };
    }
    if (locationError) {
      return { label: "Can't verify area", tone: 'warn' };
    }
    if (isServiceable === true) {
      return { label: 'Delivery Available ', tone: 'ok' };
    }
    if (isServiceable === false) {
      return { label: 'Delivery Not Available', tone: 'bad' };
    }
    return { label: 'Set delivery area', tone: 'neutral' };
  })();

  return (
    <div
      className="w-full max-w-full"
      style={{ maxWidth: '100vw' }}
      onTouchStart={(e) => {
        if (typeof window === 'undefined') return;
        if (window.scrollY > 0) return;
        const y = e.touches?.[0]?.clientY;
        if (!Number.isFinite(y)) return;
        ptrRef.current.startY = y;
        ptrRef.current.pulling = true;
      }}
      onTouchMove={(e) => {
        if (!ptrRef.current.pulling) return;
        if (typeof window === 'undefined') return;
        if (window.scrollY > 0) return;
        const y = e.touches?.[0]?.clientY;
        if (!Number.isFinite(y)) return;
        const raw = y - ptrRef.current.startY;
        if (raw <= 0) {
          setPtrPull(0);
          return;
        }
        // Resist as it grows (feel like native)
        const eased = Math.min(ptrMax, raw * 0.55);
        setPtrPull(eased);
      }}
      onTouchEnd={() => {
        if (!ptrRef.current.pulling) return;
        ptrRef.current.pulling = false;
        if (ptrPull >= ptrThreshold) {
          void beginRefresh();
          return;
        }
        setPtrPull(0);
      }}
      onTouchCancel={() => {
        ptrRef.current.pulling = false;
        setPtrPull(0);
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[80] flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, ptrPull) - 56}px)`,
          transition: ptrRef.current.pulling ? 'none' : 'transform 220ms ease-out',
        }}
        aria-hidden
      >
        <div className="mt-2 rounded-full bg-white/90 px-3 py-2 shadow-md border border-gray-100 flex items-center gap-2">
          <span
            className={`h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent ${
              ptrRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span className="text-[12px] font-semibold text-gray-700">
            {ptrRefreshing ? 'Refreshing…' : ptrPull >= ptrThreshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Home: categories carousel + banners hidden */}

      {/* Purple hero section (more than half page) */}
      <section
        className="w-full relative overflow-hidden"
        style={{
          background: '#902bf5',
          minHeight: '78vh',
          borderBottomLeftRadius: 44,
          borderBottomRightRadius: 44,
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        }}
      >
        {/* Background video */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <video
            className="h-full w-full object-cover object-bottom"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/create_a_animated_video_for_th.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Bottom shade (black -> transparent) - full width */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-52 sm:h-64"
          style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(0,0,0,0))',
          }}
          aria-hidden
        />
        <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
            <div className="relative text-white min-h-[78vh] flex flex-col pt-6 md:pt-8 pb-20 sm:pb-24 overflow-hidden">
            {/* Confetti keyframes (scoped) */}
            <style>{`
              @keyframes homeConfettiBurst {
                0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                15%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
                100% { transform: translate(-50%, -110%) scale(1.05); opacity: 0; }
              }
              @keyframes homeConfettiPiece {
                0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
              }
            `}</style>

            {/* Top row: availability + address (left), profile (right) */}
            <div className="relative z-20 flex items-start justify-between gap-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowServiceAreaSheet(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowServiceAreaSheet(true);
                  }
                }}
                className="relative inline-flex w-auto max-w-[78vw] sm:max-w-[520px] items-stretch text-left rounded-2xl border border-white/15 bg-black/20 backdrop-blur px-3 py-2.5 hover:bg-black/25 transition cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Delivery area and address"
              >
                {/* Confetti popper (inside card) */}
                {showDeliveryConfetti && (
                  <span
                    className="pointer-events-none absolute left-12 top-3 z-30"
                    style={{ animation: 'homeConfettiBurst 900ms ease-out both' }}
                    aria-hidden
                  >
                    {[
                      { c: '#a7f3d0', dx: -18, dy: -26, r: '-80deg' },
                      { c: '#34d399', dx: -8, dy: -32, r: '40deg' },
                      { c: '#fbbf24', dx: 10, dy: -30, r: '110deg' },
                      { c: '#60a5fa', dx: 18, dy: -22, r: '-20deg' },
                      { c: '#f472b6', dx: 6, dy: -18, r: '160deg' },
                      { c: '#ffffff', dx: -14, dy: -18, r: '15deg' },
                    ].map((p, i) => (
                      <span
                        key={i}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 6,
                          height: 10,
                          borderRadius: 2,
                          background: p.c,
                          opacity: 0.95,
                          ['--dx']: `${p.dx}px`,
                          ['--dy']: `${p.dy}px`,
                          ['--rot']: p.r,
                          animation: 'homeConfettiPiece 850ms cubic-bezier(0.2,0.9,0.2,1) both',
                        }}
                      />
                    ))}
                  </span>
                )}

                {/* ETA block (left) */}
                <div className="flex w-14 shrink-0 flex-col items-center justify-center  text-white">
                  <span className="text-[28px] sm:text-[32px] font-extrabold tabular-nums leading-none">
                    {animatedEta == null ? '—' : animatedEta}
                  </span>
                  <span className="mt-0.5 text-[14px] tracking-[0.1em] sm:text-[16px] font-bold opacity-90 leading-none">
                    {animatedEta == null ? '' : 'min'}
                  </span>
                </div>

                {/* Status + address (right) */}
                <div className="min-w-0 flex-1 pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        locationStatus.tone === 'ok'
                          ? 'bg-emerald-400/20 text-green-500'
                          : locationStatus.tone === 'bad'
                            ? 'bg-red-400/20 text-red-50'
                            : locationStatus.tone === 'warn'
                              ? 'bg-amber-300/20 text-amber-50'
                              : 'bg-white/15 text-white'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                      <span className="truncate max-w-[220px]">{locationStatus.label}</span>
                    </span>
                  </div>
                  {defaultAddress ? (
                    <p className="mt-1.5 text-[13px] font-medium text-white/90 truncate">
                      {addressLine}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push('/addresses');
                      }}
                      className="mt-1 inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/15"
                      aria-label="Add address"
                    >
                      Add address
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push('/search');
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 backdrop-blur hover:bg-black/25 transition"
                  aria-label="Search products"
                >
                  <Search className="w-6 h-6 text-white" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      window.location.href = '/profile';
                    } else {
                      setShowLoginSheet(true);
                    }
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 backdrop-blur hover:bg-black/25 transition"
                  aria-label={isAuthenticated ? 'Profile' : 'Login'}
                >
                  <User className="w-6 h-6 text-white" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Tagline below the availability card */}
            <div className="relative z-[9] mt-4 max-w-[92vw]">
              <p className="text-left text-[52px] sm:text-[72px] font-extrabold tracking-[0.03em] leading-[0.95] text-white drop-shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
                Groceries in Minutes ... 
              </p>
            </div>

            {/* CTA below tagline */}
            <div className="relative z-20 mt-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[13px] font-extrabold tracking-wide text-[#902bf5] shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:bg-white/90 active:scale-[0.98] transition"
              >
                Shop Now
              </Link>
            </div>

            {/* Bottom: categories carousel */}
            {categories.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 z-20">
                <div
                  ref={categoryScrollRef}
                  role="region"
                  aria-label="Categories"
                  onPointerDown={handleCategoryMouseDown}
                  onPointerLeave={handleCategoryMouseLeave}
                  onPointerUp={handleCategoryMouseUp}
                  onPointerMove={handleCategoryMouseMove}
                  onPointerCancel={handleCategoryMouseUp}
                  className="category-scroll-track flex items-center gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 cursor-grab select-none touch-pan-x snap-x snap-mandatory scroll-smooth min-w-0 w-full"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                  }}
                >
                  <div className="flex items-stretch gap-4 flex-nowrap w-max flex-shrink-0 pb-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex-shrink-0 snap-start">
                        <CategoryCard category={category} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16">
          <Container>
            <div className="flex items-start justify-between mb-4 md:mb-6 px-4 md:px-0">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow">
                  Best Sellers
                </h2>
                <p className="text-gray-600 mt-1">Most loved picks, trending right now</p>
              </div>
            </div>
            <ProductGrid products={bestSellers.slice(0, 8)} cardVariant="flat" />

            {/* Bottom center "See all →" */}
            <div className="mt-8 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                <span>See all</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* Special Offers Section */}
      {specialOffers.length > 0 && (
        <section className="relative overflow-hidden bg-white min-h-[680px] rounded-[32px] mx-4 sm:mx-6 md:mx-8 my-6">
          {/* Background video */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source
                src="/From KlickPin CF 26 Fresh romantic date night ideas that are worth saving if you love elegant details and creative inspiration for women who love classy Pinterest - Pin-1123929650777965800.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          <Container className="relative z-[2] py-14 md:py-20 lg:py-24">
            <div className="flex flex-col items-center text-center gap-2 mb-8 px-4 md:px-0">
              <div className="w-full">
                <h2 className="text-5xl md:text-6xl font-extrabold text-white font-headingnow">
                  FRESH ZONE
                </h2>
                <p className="text-gray-200 mt-1">Handpicked daily essentials</p>
              </div>
            </div>
            {/* Category tabs (carousel) */}
            {categories.length > 0 && (
              <div className="w-screen relative left-1/2 -translate-x-1/2 mb-10">
                <div className="overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
                  <div className="flex w-max gap-2 px-4 mx-auto">
                    <button
                      type="button"
                      onClick={() => setFreshZoneCategoryId(null)}
                      className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                        freshZoneCategoryId == null
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    {categories.map((cat) => {
                      const active = freshZoneCategoryId != null && String(freshZoneCategoryId) === String(cat.id);
                      const src = getCategoryImageSrc(cat);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFreshZoneCategoryId(cat.id)}
                          className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                            <img
                              src={src || '/icons/dummy-category-card-icon.png'}
                              alt=""
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/icons/dummy-category-card-icon.png';
                              }}
                            />
                          </span>
                          <span className="max-w-[9.5rem] truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Products (carousel) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2">
              <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory">
                <div className="flex w-max gap-3 px-4 mx-auto">
                  {freshZoneProducts.slice(0, 12).map((product) => (
                    <div key={product.id} className="snap-start flex-shrink-0">
                      <ProductCard product={product} isCarousel />
                    </div>
                  ))}
                </div>
              </div>
              {freshZoneSelectedCategory && freshZoneProducts.length === 0 && (
                <div className="px-4 pb-2 text-sm text-gray-500">
                  No products found for <span className="font-semibold text-gray-800">{freshZoneSelectedCategory.name}</span>.
                </div>
              )}
            </div>

            {/* Bottom center "See all →" (no background) */}
            <div className="mt-10 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/90 hover:text-white transition"
              >
                <span>See all</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
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

      {/* Order Again Section */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-12 lg:py-16 bg-white">
          <Container>
            <div className="mb-4 md:mb-6 px-4 md:px-0">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 font-headingnow leading-[1]">
                Buy Again
              </h2>
              <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                Your frequently purchased items, ready to reorder.
              </p>
            </div>

            {/* Category carousel */}
            {categories.length > 0 && (
              <div className="w-screen relative left-1/2 -translate-x-1/2 mb-5">
                <div className="overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
                  <div className="flex w-max gap-2 px-4 mx-auto">
                    <button
                      type="button"
                      onClick={() => setOrderAgainCategoryId(null)}
                      className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                        orderAgainCategoryId == null
                          ? 'border-gray-900 bg-gray-900/5 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    {categories.map((cat) => {
                      const active = orderAgainCategoryId != null && String(orderAgainCategoryId) === String(cat.id);
                      const src = getCategoryImageSrc(cat);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setOrderAgainCategoryId(cat.id)}
                          className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                            active
                              ? 'border-gray-900 bg-gray-900/5 text-gray-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                            <img
                              src={src || '/icons/dummy-category-card-icon.png'}
                              alt=""
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/icons/dummy-category-card-icon.png';
                              }}
                            />
                          </span>
                          <span className="max-w-[9.5rem] truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Products carousel (2-ish cards per view) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2">
              <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory">
                <div className="flex w-max gap-2 px-4">
                  {orderAgainProducts.slice(0, 12).map((product) => (
                    <div key={product.id} className="snap-start flex-shrink-0">
                      <ProductCard product={product} isCarousel />
                    </div>
                  ))}
                </div>
              </div>

              {/* Second products carousel (next set) */}
              {orderAgainProducts.length > 12 && (
                <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory mt-3">
                  <div className="flex w-max gap-2 px-4">
                    {orderAgainProducts.slice(12, 24).map((product) => (
                      <div key={product.id} className="snap-start flex-shrink-0">
                        <ProductCard product={product} isCarousel />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Third products carousel (next set) */}
              {orderAgainProducts.length > 24 && (
                <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory mt-3">
                  <div className="flex w-max gap-2 px-4">
                    {orderAgainProducts.slice(24, 36).map((product) => (
                      <div key={product.id} className="snap-start flex-shrink-0">
                        <ProductCard product={product} isCarousel />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orderAgainSelectedCategory && orderAgainProducts.length === 0 && (
                <div className="px-4 pb-2 text-sm text-gray-500">
                  No products found for{' '}
                  <span className="font-semibold text-gray-800">{orderAgainSelectedCategory.name}</span>.
                </div>
              )}
            </div>

            {/* Bottom center "See all →" */}
            <div className="mt-6 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-800 hover:text-gray-900 transition"
              >
                <span>See all</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* View All Products CTA */}
      <section className="py-8 md:py-12 lg:py-16 bg-white">
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
