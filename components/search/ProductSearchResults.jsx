'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard';
import FadeInWhenVisible from '../motion/FadeInWhenVisible';
import ProductCarousel from '../ProductCarousel';
import InfiniteScrollSentinel from '../InfiniteScrollSentinel';
import BannerCarousel from '../BannerCarousel';
import { SearchResultsGridSkeleton } from '../skeletons/SearchPageSkeleton';
import { useInfiniteSearchProducts, useProducts } from '../../hooks/useProducts';
import { useShopBranding } from '../../context/ShopBrandingContext';
import { buildDiscoverSections } from './searchDiscover';

function DiscoverSections({ sections, freshBanner }) {
  const available = (sections || []).filter((s) => (s.products || []).length > 0);
  if (!available.length) return null;

  return (
    <div className="mt-6 space-y-8">
      {available.map((section) => (
        <section key={section.key} aria-label={section.title}>
          <div className="mb-4">
            <h2 className="font-headingnow text-2xl font-extrabold leading-[1] text-gray-900 sm:text-3xl">
              {section.title}
            </h2>
            <p className="mt-2 text-[13px] text-gray-500 md:text-sm">{section.description}</p>
          </div>
          {section.key === 'search-fallback-new' && freshBanner}
          <ProductCarousel products={section.products} showMoreLink="/products" />
        </section>
      ))}
    </div>
  );
}

/**
 * Existing search results body — shared by in-place overlay and /search route.
 * Uses the same hooks/API as the previous search page.
 */
export default function ProductSearchResults({ q }) {
  const trimmed = String(q || '').trim();
  const showDiscover = trimmed.length < 2;

  const { bannerEnabled, bannerImages } = useShopBranding();
  const isLocalDev = process.env.NODE_ENV !== 'production';

  const shopBanners = useMemo(() => {
    if (isLocalDev) {
      return [
        { id: 'local-1', image: '/banner/360_F_249501541_XmWdfAfUbWAvGxBwAM0ba2aYT36ntlpH.jpg' },
        {
          id: 'local-2',
          image:
            '/banner/11871820-online-shopping-am-telefon-kaufen-verkaufen-geschaft-digitale-web-banner-anwendung-geldwerbung-zahlung-e-commerce-illustration-suche-vektor.jpg',
        },
        { id: 'local-3', image: '/banner/360_F_465465254_1pN9MGrA831idD6zIBL7q8rnZZpUCQTy.jpg' },
      ];
    }
    if (!Array.isArray(bannerImages) || bannerImages.length === 0) return [];
    if (bannerEnabled === false) return [];
    return bannerImages.map((url, index) => ({
      id: `shop-banner-${index}`,
      image: url,
    }));
  }, [bannerEnabled, bannerImages, isLocalDev]);

  const freshBanner = useMemo(() => {
    if (!shopBanners.length) return null;
    return (
      <div className="mb-4">
        <div className="overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-gray-200/80">
          <BannerCarousel
            banners={shopBanners}
            fallbackToDefaults={false}
            imageClassName="object-cover object-center"
            className="bg-white"
          />
        </div>
      </div>
    );
  }, [shopBanners]);

  const {
    data: searchInfinite,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteSearchProducts({ q: trimmed, per_page: 24, search_mode: 'contains' });

  const products = useMemo(
    () => (searchInfinite?.pages || []).flatMap((p) => p?.products || []),
    [searchInfinite?.pages]
  );

  const { data: discoverCatalog } = useProducts({
    limit: 48,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: showDiscover,
  });

  const discoverSections = useMemo(() => {
    if (!showDiscover) return [];
    return buildDiscoverSections(discoverCatalog?.products);
  }, [showDiscover, discoverCatalog?.products]);

  if (trimmed.length < 2) {
    return (
      <>
        <div className="py-8 text-center text-gray-500">
          Type at least <span className="font-semibold">2 letters</span> to search.
        </div>
        <DiscoverSections sections={discoverSections} freshBanner={freshBanner} />
      </>
    );
  }

  if (isLoading) {
    return <SearchResultsGridSkeleton />;
  }

  if (products.length === 0) {
    return (
      <>
        <div className="py-12 text-center">
          <p className="text-[14px] font-semibold text-gray-800">No products found</p>
          <p className="mt-1 text-[12px] text-gray-500">Try searching with different keywords.</p>
          <Link
            href="/categories"
            className="mt-6 inline-flex text-[12px] font-semibold text-violet-700 hover:text-violet-800"
          >
            Browse categories
          </Link>
        </div>
        <DiscoverSections sections={discoverSections} freshBanner={freshBanner} />
      </>
    );
  }

  return (
    <>
      <p className="mb-3 text-[11px] text-gray-400">
        Showing {products.length} result{products.length !== 1 ? 's' : ''} for “{trimmed}”
      </p>
      <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <FadeInWhenVisible
            key={product.id}
            className="h-full"
            delay={Math.min(index * 0.03, 0.24)}
          >
            <ProductCard product={product} />
          </FadeInWhenVisible>
        ))}
      </div>
      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        showEndLabel={products.length > 0 && !hasNextPage}
      />
    </>
  );
}
