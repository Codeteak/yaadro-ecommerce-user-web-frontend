'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useProduct,
  useProducts,
  useRelatedProducts,
} from '../../../hooks/useProducts';
import { useCart } from '../../../context/CartContext';
import { useRecentlyViewed } from '../../../context/RecentlyViewedContext';
import { useAlert } from '../../../context/AlertContext';
import { useShopBranding } from '../../../context/ShopBrandingContext';
import {
  applyProductSocialMetaToDocument,
  buildProductShareUrl,
  fetchProductSeoMetadata,
  getProductSocialDescription,
} from '../../../utils/productMetadata';
import { filterRelatedProducts } from '../../../lib/storefrontProductDetail';
import {
  getProductRating,
  getProductDiscount,
  getEffectivePrice,
  getListPrice,
  formatRupeeINR,
  formatBundleRuleLabel,
  formatWeightUnitLabel,
  getPrimaryBundleRule,
  resolveProductWeightAndUnit,
  stripPackFromProductName,
} from '../../../utils/productUtils';
import { buildAvailableSizes, resolveSelectedSize, sizePackCount, sizeAddQuantity, cartQuantityStep, weightStepLinePrices, hasCustomWeightStep, formatCartQtyControlLabel } from '../../../utils/productSizeSelection';
import { playAddTap } from '../../../utils/playAddTap';
import Container from '../../../components/Container';
import ProductDetailSkeleton from '../../../components/ProductDetailSkeleton';
import PdpOfferPanel from '../../../components/promotions/PdpOfferPanel';
import Link from 'next/link';
import ProductCarousel from '../../../components/ProductCarousel';
import Breadcrumbs from '../../../components/Breadcrumbs';
import PriceDisplay from '../../../components/ui/PriceDisplay';
import { PRESSABLE_ICON_BTN_SOFT } from '../../../components/ui/brandButton';
import { SHOW_PRODUCT_EXTENDED_SECTIONS } from './productDetailFlags';
import { getResolvedProductImageUrls, PRODUCT_IMAGE_PLACEHOLDER } from '../../../utils/productImages';
import ProductImageWithFallback from '../../../components/ProductImageWithFallback';
import FloatingViewCartPill from '../../../components/FloatingViewCartPill';
import { getCartLinePaidQty, getBundleFreeExtraOnPaidLine } from '../../../utils/cartPromotions';
import { findPaidCartLine } from '../../../utils/cartLinePersist';
import { getProductDetailPath, normalizeProductRouteParam, resolveProductDetailSegment } from '../../../utils/productApi';
import { backFromProductDetail, navigateToProductDetail } from '../../../utils/productNavigation';

function PillTag({ children, color = 'green' }) {
  const colorMap = {
    green: 'bg-violet-100 text-violet-800',
    orange: 'bg-amber-100 text-amber-800',
    discountGreen: 'bg-violet-600 text-white shadow-sm font-bold',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

/** Section titles on PDP — softer than home hero rails so body sections stay readable. */
function DetailSectionTitle({ children }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-700 font-headingnow leading-tight">
      {children}
    </h2>
  );
}

function Divider() {
  return <hr className="border-t border-gray-100 my-5" />;
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className="text-[13px] font-medium text-gray-800">{value}</p>
    </div>
  );
}

function OfferRow({ iconBg, iconColor, children }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}
      >
        <svg
          className={`w-3.5 h-3.5 ${iconColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z"
          />
        </svg>
      </div>
      <p className="text-[12px] text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function ReviewCard({ author, rating, text }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[12px] font-medium text-gray-800 mb-1">{author}</p>
      <div className="flex mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < rating ? 'text-amber-400' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
          </svg>
        ))}
      </div>
      <p className="text-[12px] text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

export default function ProductDetailClient({ productId = null }) {
  const params = useParams();
  const router = useRouter();
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { showAlert } = useAlert();
  const { shopName } = useShopBranding();

  const [cartActionLoading, setCartActionLoading] = useState(false);

  const resolvedId =
    productId != null
      ? normalizeProductRouteParam(productId)
      : normalizeProductRouteParam(params?.id ?? params?.slug);
  // Product-only first (customer API). Related category list loads after paint.
  const { data: product, isLoading: loading } = useProduct(resolvedId);
  const relatedCategoryId =
    product?.categoryId ||
    product?.category_id ||
    (product?.category && typeof product.category === 'object'
      ? product.category.id
      : null) ||
    null;
  const { data: relatedListData } = useRelatedProducts(
    relatedCategoryId,
    product?.id,
    { enabled: !!relatedCategoryId, limit: 12 }
  );
  const relatedProducts = useMemo(
    () => filterRelatedProducts(relatedListData?.products || [], product?.id, 12),
    [relatedListData?.products, product?.id]
  );

  useEffect(() => {
    if (!resolvedId) return undefined;

    let cancelled = false;

    (async () => {
      const segment =
        resolveProductDetailSegment(product) || resolvedId;
      const seoResult = await fetchProductSeoMetadata(segment);
      if (cancelled) return;

      const shareUrl =
        seoResult?.seo?.canonicalUrl ||
        buildProductShareUrl(product, resolvedId);

      if (seoResult?.seo) {
        applyProductSocialMetaToDocument({
          seo: seoResult.seo,
          siteName: shopName,
          url: shareUrl,
        });
        return;
      }

      if (!product?.name) return;
      const images = getResolvedProductImageUrls(product);
      applyProductSocialMetaToDocument({
        title: product.name,
        description: getProductSocialDescription(product),
        imageUrl: images[0],
        url: shareUrl,
        siteName: shopName,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [product, resolvedId, shopName]);

  useEffect(() => {
    if (product) addToRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const rating = product ? getProductRating(product) : 0;
  const discount = product ? getProductDiscount(product) : 0;
  const bundleLabel = useMemo(() => {
    if (!product) return null;
    const rule = getPrimaryBundleRule(product);
    return rule ? formatBundleRuleLabel(rule) : null;
  }, [product]);

  const galleryUrls = useMemo(
    () => (product ? getResolvedProductImageUrls(product) : []),
    [product]
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id, galleryUrls.join('|')]);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const availableSizes = useMemo(() => buildAvailableSizes(product), [product]);
  const [selectedSize, setSelectedSize] = useState(() => availableSizes[0] || null);
  const activeSize = useMemo(
    () => resolveSelectedSize(availableSizes, selectedSize),
    [availableSizes, selectedSize]
  );

  useEffect(() => {
    setSelectedSize((prev) => resolveSelectedSize(availableSizes, prev));
  }, [availableSizes, product?.id, product?.price, product?.actualPriceMinor]);

  const listUnit = activeSize
    ? parseFloat(activeSize.price)
    : product
    ? parseFloat(product.price)
    : 0;
  const stepLinePrices = weightStepLinePrices(product, activeSize);
  const resolvedPack = product ? resolveProductWeightAndUnit(product) : { weight: null, unit: '' };
  const displayWeight = activeSize?.label
    ? activeSize.label
    : activeSize
      ? formatWeightUnitLabel(activeSize.weight, activeSize.unit)
      : formatWeightUnitLabel(resolvedPack.weight, resolvedPack.unit);

  const descriptionText =
    typeof product?.description === 'string' ? product.description.trim() : '';

  // "Small Onion 10kg" -> "Small Onion" (used to find other pack variants).
  const baseName = useMemo(() => stripPackFromProductName(product?.name || ''), [product?.name]);
  const baseNameKey = useMemo(() => baseName.trim().toLowerCase(), [baseName]);
  const { data: sameNameListData } = useProducts({
    search: baseName,
    limit: 50,
    sort_by: 'name',
    sort_order: 'asc',
    enabled: Boolean(baseName && baseName.length >= 2),
  });
  const sameNameVariants = useMemo(() => {
    const list = sameNameListData?.products || [];
    if (!baseNameKey || list.length === 0) return [];

    const keep = list.filter((p) => {
      const n = stripPackFromProductName(p?.name || '').trim().toLowerCase();
      return n === baseNameKey;
    });

    // Unique by pack label so multiple API rows don't duplicate.
    const seen = new Set();
    const out = [];
    for (const p of keep) {
      if (!p?.id) continue;
      const resolved = resolveProductWeightAndUnit(p);
      const pack = formatWeightUnitLabel(resolved.weight, resolved.unit);
      const key = `${pack || ''}::${String(p.id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...p,
        _packLabel: pack,
      });
    }

    // Sort small -> large by size within unit group (GM/KG/ML/L/PC...).
    out.sort((a, b) => {
      const ar = resolveProductWeightAndUnit(a);
      const br = resolveProductWeightAndUnit(b);
      const au = String(ar.unit || '');
      const bu = String(br.unit || '');
      if (au && bu && au !== bu) return au.localeCompare(bu);
      const aw = ar.weight;
      const bw = br.weight;
      if (aw != null && bw != null && aw !== bw) return aw - bw;
      if (aw != null && bw == null) return -1;
      if (aw == null && bw != null) return 1;
      return String(a._packLabel || '').localeCompare(String(b._packLabel || ''));
    });

    return out;
  }, [sameNameListData?.products, baseNameKey]);

  const legacyOriginal =
    product?.originalPrice != null ? parseFloat(product.originalPrice) : null;
  // Custom weight: show ₹ for the selected step (250 g), not the full ₹/kg.
  const customWeight = hasCustomWeightStep(product);
  const perKgList = product ? getListPrice(product) || parseFloat(product.price) || 0 : 0;
  const perKgPay = product ? getEffectivePrice(product, perKgList) || perKgList : 0;
  const effectivePrice = customWeight
    ? perKgPay
    : stepLinePrices
      ? stepLinePrices.pay
      : product
        ? getEffectivePrice(product, listUnit)
        : 0;
  const mrpDisplay = customWeight
    ? perKgList > perKgPay + 1e-9
      ? perKgList
      : null
    : stepLinePrices
      ? stepLinePrices.list > stepLinePrices.pay + 1e-9
        ? stepLinePrices.list
        : null
      : product && effectivePrice < listUnit - 1e-9
        ? listUnit
        : legacyOriginal != null && legacyOriginal > effectivePrice
          ? legacyOriginal
          : null;
  const discountValue =
    mrpDisplay != null && mrpDisplay > effectivePrice ? mrpDisplay - effectivePrice : null;
  const deliveryTimeEstimate = product?.deliveryTimeEstimate ?? '5–7 business days';
  const nutritionalInformation = product?.nutritionalInformation ?? null;
  const allergenInformation = product?.allergenInformation ?? null;
  const storageInstructions =
    product?.storageInstructions ||
    (product?.storageType
      ? `Store in ${String(product.storageType).replace('_', ' ')}.`
      : null);
  // Only show related/FBT when the API (or category-related query) provides real items.
  // Do not invent "Similar" / "Frequently Bought" from a random newest-products pool.
  const similarItems = useMemo(() => {
    if (Array.isArray(relatedProducts) && relatedProducts.length > 0) return relatedProducts;
    return [];
  }, [relatedProducts]);

  const fbtItems = useMemo(() => {
    const apiFBT = product?.frequentlyBoughtTogether;
    if (Array.isArray(apiFBT) && apiFBT.length > 0) return apiFBT;
    return [];
  }, [product?.frequentlyBoughtTogether]);

  const productToAddPayload = useMemo(
    () =>
      product
        ? {
            ...product,
            price: activeSize?.weightStep ? getEffectivePrice(product) : effectivePrice,
            ...(activeSize?.weightStep
              ? (() => {
                  const list = getListPrice(product);
                  const pay = getEffectivePrice(product);
                  return list > pay + 1e-9 ? { originalPrice: list } : {};
                })()
              : mrpDisplay != null
                ? { originalPrice: mrpDisplay }
                : {}),
            selectedSize: activeSize,
            sizeDisplay: displayWeight,
          }
        : null,
    [product, effectivePrice, mrpDisplay, activeSize, displayWeight]
  );

  const cartLine = useMemo(
    () => (product ? findPaidCartLine(cartItems, product.id, activeSize, product) : null),
    [cartItems, product, activeSize]
  );

  const paidCartQty = cartLine ? getCartLinePaidQty(cartLine) : 0;
  const cartQty = paidCartQty;
  const bundleFreeExtra =
    cartLine && !cartLine.isBundleReward ? getBundleFreeExtraOnPaidLine(cartLine) : 0;
  const cartUpdateKey = cartLine
    ? cartLine.cartItemKey ?? cartLine.cartItemId ?? cartLine.id
    : null;

  const handleAddToCart = useCallback(async (event) => {
    playAddTap(event?.currentTarget);
    if (!productToAddPayload || !product?.inStock) return;
    setCartActionLoading(true);
    try {
      await addToCart(productToAddPayload, sizeAddQuantity(product, activeSize));
    } finally {
      setCartActionLoading(false);
    }
  }, [addToCart, productToAddPayload, product?.inStock, activeSize]);

  const handleStepperIncrement = useCallback(() => {
    if (cartActionLoading || !productToAddPayload || cartUpdateKey == null) return;
    const step = cartQuantityStep(product);
    updateQuantity(cartUpdateKey, Math.round((cartQty + step) * 10000) / 10000);
  }, [cartActionLoading, productToAddPayload, cartUpdateKey, cartQty, updateQuantity, product]);

  const handleStepperDecrement = useCallback(() => {
    if (cartActionLoading || cartUpdateKey == null || cartQty <= 0) return;
    const step = cartQuantityStep(product);
    if (cartQty <= step + 1e-9) {
      removeFromCart(cartUpdateKey);
    } else {
      updateQuantity(cartUpdateKey, Math.round((cartQty - step) * 10000) / 10000);
    }
  }, [cartActionLoading, cartUpdateKey, cartQty, removeFromCart, updateQuantity, product]);

  const goToPrevious = () =>
    setCurrentImageIndex((p) => {
      const n = galleryUrls.length;
      if (n < 1) return 0;
      return (p - 1 + n) % n;
    });
  const goToNext = () =>
    setCurrentImageIndex((p) => {
      const n = galleryUrls.length;
      if (n < 1) return 0;
      return (p + 1) % n;
    });
  const minSwipeDistance = 50;
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const d = touchStart - touchEnd;
    if (d > minSwipeDistance) goToNext();
    if (d < -minSwipeDistance) goToPrevious();
  };

  const formatDate = (d) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return isNaN(date.getTime())
        ? d
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">Product Not Found</h1>
        <p className="text-gray-500 text-sm mb-8">The product you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/products"
          className="bg-violet-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-violet-700 transition"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full bg-gray-50 pb-24">
      <div className="border-b border-gray-100 bg-white px-4 sm:px-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            {
              label:
                product.categoryName ||
                (typeof product.category === 'string' ? product.category : null) ||
                product.primaryCategoryName ||
                'Products',
              href: product.categoryId
                ? `/products?category=${encodeURIComponent(product.categoryId)}`
                : product.category
                  ? `/products?category=${encodeURIComponent(
                      typeof product.category === 'string'
                        ? product.category
                        : product.category?.name || product.category?.id || ''
                    )}`
                  : '/products',
            },
            { label: product.name },
          ]}
        />
      </div>

      <section className="relative w-full overflow-hidden bg-white">
        <div
          className="relative mx-auto w-full max-w-lg h-[min(36vh,280px)] sm:h-[min(40vh,320px)]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {galleryUrls.map((img, idx) => (
              <div
                key={`${idx}-${img}`}
                className="relative h-full w-full flex-shrink-0 bg-white"
              >
                <ProductImageWithFallback
                  src={img}
                  alt={`${product.name} – image ${idx + 1}`}
                  fill
                  className="object-contain object-center p-3 sm:p-4"
                  sizes="(max-width: 640px) 100vw, 512px"
                  priority={idx === 0}
                  placeholderName={product.name}
                  placeholderCategory={
                    product.categoryName ||
                    product.category?.name ||
                    (typeof product.category === 'string' ? product.category : '') ||
                    product.primaryCategoryName ||
                    ''
                  }
                />
              </div>
            ))}
          </div>

        </div>

        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => backFromProductDetail(router)}
            className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm border border-gray-100 ${PRESSABLE_ICON_BTN_SOFT}`}
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-9" aria-hidden />
        </div>

        {galleryUrls.length > 1 && (
          <>
            <button type="button" onClick={goToPrevious} className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm z-20 border border-gray-100 ${PRESSABLE_ICON_BTN_SOFT}`} aria-label="Previous">
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={goToNext} className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm z-20 border border-gray-100 ${PRESSABLE_ICON_BTN_SOFT}`} aria-label="Next">
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {galleryUrls.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center px-3">
            <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-white/80 px-1.5 py-1 shadow-sm backdrop-blur-md" role="tablist" aria-label="Product images">
              {galleryUrls.map((u, idx) => (
                <button
                  key={`thumb-${idx}-${u}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentImageIndex}
                  aria-label={`Show image ${idx + 1}`}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    idx === currentImageIndex ? 'border-violet-600 ring-1 ring-violet-500/30' : 'border-white/80 opacity-90 hover:opacity-100'
                  }`}
                >
                  <ProductImageWithFallback
                    src={u}
                    alt={`${product.name} – thumbnail ${idx + 1}`}
                    fill
                    className="object-contain"
                    sizes="36px"
                    placeholderName={product.name}
                    placeholderCategory={
                      product.categoryName ||
                      product.category?.name ||
                      (typeof product.category === 'string' ? product.category : '') ||
                      product.primaryCategoryName ||
                      ''
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="relative z-10 bg-white rounded-t-2xl border-t border-gray-100 pt-4 pb-2">
        <Container>
          <div className="max-w-2xl mx-auto">
            <section
              className="space-y-3.5 border-b border-gray-100 pb-5 mb-5"
              aria-label="Product details"
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {product.organicTag && <PillTag color="green">Organic</PillTag>}
                {product.vegNonVeg === 'veg' && <PillTag color="green">🟢 Veg</PillTag>}
                {product.vegNonVeg === 'non_veg' && <PillTag color="red">🔴 Non-veg</PillTag>}
                {discount > 0 && <PillTag color="discountGreen">{discount}% OFF</PillTag>}
                {!discount && discountValue != null && discountValue > 0 && (
                  <PillTag color="discountGreen">₹{formatRupeeINR(discountValue)} off</PillTag>
                )}
                {bundleLabel && <PillTag color="green">{bundleLabel}</PillTag>}
                {product.inStock ? (
                  <PillTag color="blue">In Stock</PillTag>
                ) : (
                  <PillTag color="red">Out of Stock</PillTag>
                )}
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {String(product.brand || '').trim() ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {String(product.brand).trim()}
                  </p>
                ) : null}
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug text-balance">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-0 gap-y-1.5 text-[13px] sm:text-sm text-gray-600">
                  {displayWeight && (
                    <span className="font-medium text-gray-700 tabular-nums">{displayWeight}</span>
                  )}
                  {displayWeight && product.packSize && (
                    <span className="mx-2 text-gray-300 select-none" aria-hidden>
                      ·
                    </span>
                  )}
                  {product.packSize && (
                    <span>
                      Pack: <span className="font-medium text-gray-800">{product.packSize}</span>
                    </span>
                  )}
                  {(displayWeight || product.packSize) && rating > 0 && (
                    <span className="mx-2 text-gray-300 select-none" aria-hidden>
                      ·
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900 ring-1 ring-violet-100/80">
                      <svg className="h-3 w-3 fill-violet-600" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                      </svg>
                      {rating.toFixed(1)}
                      {product.ratingsCount > 0 && (
                        <span className="font-normal text-violet-700/80">
                          ({product.ratingsCount})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pt-0.5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {product?.bxgyShelfRole === 'get' ? (
                        <div className="text-2xl font-bold leading-none sm:text-3xl">
                          <span className="text-violet-700">Free</span>
                          {mrpDisplay != null && mrpDisplay > 0 ? (
                            <span className="ml-2 text-base font-medium text-gray-400 line-through tabular-nums">
                              ₹{formatRupeeINR(mrpDisplay)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <PriceDisplay
                          amount={effectivePrice}
                          listPrice={mrpDisplay}
                          size="lg"
                          suffix={customWeight ? '/kg' : undefined}
                        />
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {product?.bxgyShelfRole === 'get' ? (
                        <div
                          className="inline-flex h-9 items-center justify-center rounded-l-[22px] rounded-r-[10px] bg-emerald-600 px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm"
                          aria-label="Free with offer — added when you buy the paired product"
                        >
                          Free
                        </div>
                      ) : cartQty > 0 ? (
                        <>
                          <div
                            className="inline-flex h-9 min-w-[96px] items-center justify-between rounded-full bg-white px-2 ring-2 ring-[#902bf5] shadow-[0_8px_20px_rgba(144,43,245,0.35)]"
                            role="group"
                            aria-label="Quantity"
                          >
                            <button
                              type="button"
                              onClick={() => void handleStepperDecrement()}
                              disabled={cartActionLoading}
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#902bf5] transition active:scale-95 disabled:opacity-50"
                              aria-label="Decrease quantity"
                            >
                              <span className="text-base font-bold leading-none">−</span>
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-[#902bf5]">
                              {formatCartQtyControlLabel(product, cartQty)}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleStepperIncrement()}
                              disabled={cartActionLoading}
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#902bf5] transition active:scale-95 disabled:opacity-50"
                              aria-label="Increase quantity"
                            >
                              <span className="text-base font-bold leading-none">+</span>
                            </button>
                          </div>
                          {bundleFreeExtra > 0 ? (
                            <span className="text-[12px] font-medium text-emerald-700 tabular-nums">
                              +{bundleFreeExtra} free
                            </span>
                          ) : null}
                          <Link
                            href="/cart"
                            className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[12px] font-semibold text-[#902bf5] transition hover:bg-violet-50"
                          >
                            Go to cart
                          </Link>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => void handleAddToCart(e)}
                          disabled={!product.inStock || cartActionLoading}
                          className={`flex h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-l-[24px] rounded-r-[12px] px-5 text-[13px] font-bold uppercase leading-none tracking-[0.14em] transition active:scale-[0.97] touch-manipulation ${
                            product.inStock
                              ? 'bg-[#902bf5] text-white shadow-[0_8px_20px_rgba(144,43,245,0.4)] hover:bg-[#7d24d6] disabled:opacity-70'
                              : 'cursor-not-allowed bg-gray-100 text-gray-400'
                          }`}
                        >
                          {cartActionLoading ? (
                            <span
                              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                              aria-hidden
                            />
                          ) : null}
                          {product.inStock ? 'ADD' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                  <PdpOfferPanel product={product} />
                </div>
              </div>
            </section>

            {sameNameVariants.length > 1 ? (
              <>
                <DetailSectionTitle>{baseName || 'Available packs'}</DetailSectionTitle>
                <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3 w-max pb-2">
                    {sameNameVariants.map((p) => {
                      const packLabel =
                        p._packLabel ||
                        formatWeightUnitLabel(
                          resolveProductWeightAndUnit(p).weight,
                          resolveProductWeightAndUnit(p).unit
                        );
                      const img = getResolvedProductImageUrls(p)[0] || PRODUCT_IMAGE_PLACEHOLDER;
                      const active = product?.id && String(product.id) === String(p.id);
                      const priceValue = getEffectivePrice(p, Number(p.price ?? 0) || 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => navigateToProductDetail(router, getProductDetailPath(p))}
                          className={`flex w-[128px] shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition ${
                            active
                              ? 'border-violet-500 ring-2 ring-violet-200'
                              : 'border-gray-200 hover:border-gray-300'
                          } bg-white`}
                          aria-label={`${p.name || baseName} ${packLabel}`}
                        >
                          <div className="relative h-[86px] w-full bg-gray-50">
                            <ProductImageWithFallback
                              src={img}
                              alt={p.name || ''}
                              fill
                              className="object-cover object-center"
                              sizes="128px"
                              placeholderName={p.name || product.name}
                              placeholderCategory={
                                p.categoryName ||
                                p.category?.name ||
                                (typeof p.category === 'string' ? p.category : '') ||
                                product.categoryName ||
                                (typeof product.category === 'string' ? product.category : '') ||
                                ''
                              }
                            />
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-[14px] font-extrabold text-gray-900 leading-tight line-clamp-1">
                              {packLabel || 'Pack'}
                            </p>
                            <div className="mt-1.5">
                              <span className="inline-flex items-center rounded-full bg-violet-600 px-2.5 py-1 text-[12px] font-extrabold text-white shadow-sm tabular-nums">
                                ₹{formatRupeeINR(priceValue)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Divider />
              </>
            ) : null}

            {availableSizes.length > 1 && (
              <>
                <DetailSectionTitle>Size / Variant</DetailSectionTitle>
                <div className="flex flex-wrap gap-2 mb-5 mt-3">
                  {availableSizes.map((size, i) => {
                    const isActive =
                      sizePackCount(selectedSize) === sizePackCount(size) &&
                      String(selectedSize?.weight ?? '') === String(size.weight ?? '') &&
                      String(selectedSize?.unit ?? '') === String(size.unit ?? '');
                    const chipLabel =
                      size.label || `${size.weight} ${size.unit}`.trim();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400'
                        }`}
                      >
                        {chipLabel} — ₹
                        {formatRupeeINR(
                          (() => {
                            const step = weightStepLinePrices(product, size);
                            if (step) return step.pay;
                            return product
                              ? getEffectivePrice(product, parseFloat(size.price))
                              : parseFloat(size.price);
                          })()
                        )}
                      </button>
                    );
                  })}
                </div>
                <Divider />
              </>
            )}

            {descriptionText ? (
              <>
                <DetailSectionTitle>Description</DetailSectionTitle>
                <p className="mt-2 text-[13px] md:text-sm text-gray-600 leading-relaxed mb-5 whitespace-pre-wrap">
                  {descriptionText}
                </p>
                <Divider />
              </>
            ) : null}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <DetailSectionTitle>Key Details</DetailSectionTitle>
                <div className="grid grid-cols-2 gap-2.5 mb-5 mt-3">
                  {product.brand && <InfoCard label="Brand" value={product.brand} />}
                  {product.category && (
                    <InfoCard label="Category" value={product.category} />
                  )}
                  <InfoCard label="Delivery" value={deliveryTimeEstimate} />
                  {product.countryOfOrigin && (
                    <InfoCard label="Origin" value={product.countryOfOrigin} />
                  )}
                  {product.shelfLife && (
                    <InfoCard label="Shelf life" value={product.shelfLife} />
                  )}
                  <InfoCard
                    label="Returns"
                    value={product.returnable !== false ? '7-day return' : 'Non-returnable'}
                  />
                  {product.expiryDate && (
                    <InfoCard label="Best before" value={formatDate(product.expiryDate)} />
                  )}
                  {product.warranty && <InfoCard label="Warranty" value={product.warranty} />}
                </div>

                <Divider />
              </>
            )}

            {product.ingredients && (
              <>
                <DetailSectionTitle>Ingredients</DetailSectionTitle>
                <p className="mt-2 text-[13px] md:text-sm text-gray-500 leading-relaxed mb-5 whitespace-pre-wrap">
                  {product.ingredients}
                </p>
                <Divider />
              </>
            )}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <DetailSectionTitle>Nutritional info (per 100g)</DetailSectionTitle>
                {nutritionalInformation ? (
                  <p className="mt-2 text-[13px] md:text-sm text-gray-500 leading-relaxed mb-5 whitespace-pre-wrap">
                    {typeof nutritionalInformation === 'string'
                      ? nutritionalInformation
                      : JSON.stringify(nutritionalInformation)}
                  </p>
                ) : (
                  <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden mb-5 text-[12px]">
                    {[
                      ['Energy', '892 kcal'],
                      ['Total fat', '99.1 g'],
                      ['Saturated fat', '82 g'],
                      ['Carbohydrates', '0 g'],
                      ['Protein', '0 g'],
                    ].map(([label, val], i) => (
                      <div
                        key={i}
                        className={`flex justify-between px-3 py-2 ${i !== 4 ? 'border-b border-gray-100' : ''} ${i === 0 ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        <span className="text-gray-500">{label}</span>
                        <span className="text-gray-800 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Divider />
              </>
            )}

            {(allergenInformation || storageInstructions) && (
              <>
                <DetailSectionTitle>Allergens & Storage</DetailSectionTitle>
                {allergenInformation && (
                  <p className="mt-2 text-[13px] md:text-sm text-gray-500 leading-relaxed mb-2">{allergenInformation}</p>
                )}
                {storageInstructions && (
                  <p className="text-[13px] md:text-sm text-gray-500 leading-relaxed mb-5">{storageInstructions}</p>
                )}
                <Divider />
              </>
            )}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <DetailSectionTitle>Coupons & Offers</DetailSectionTitle>
                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-3 mb-5 mt-3">
                  <OfferRow iconBg="bg-violet-100" iconColor="text-violet-700">
                    <strong>10% cashback</strong> on Amazon Pay Balance. Min order ₹299.
                  </OfferRow>
                  <OfferRow iconBg="bg-blue-100" iconColor="text-blue-700">
                    <strong>5% off</strong> with City Union Bank credit cards. No min order.
                  </OfferRow>
                  <OfferRow iconBg="bg-amber-100" iconColor="text-amber-700">
                    <strong>₹50 cashback</strong> via CRED Pay on orders above ₹499.
                  </OfferRow>
                  <OfferRow iconBg="bg-purple-100" iconColor="text-purple-700">
                    <strong>15% off</strong> your first flight booking with partner app.
                  </OfferRow>
                </div>

                <Divider />

                <DetailSectionTitle>Customer Reviews</DetailSectionTitle>
                <div className="space-y-2.5 mb-5 mt-3">
                  <ReviewCard
                    author="Priya M."
                    rating={5}
                    text="Best product I've used. Completely natural and smells amazing. A staple in our kitchen now."
                  />
                  <ReviewCard
                    author="Rahul K."
                    rating={4}
                    text="Good quality, nice packaging. Delivery was quick. Will definitely order again."
                  />
                </div>
              </>
            )}
          </div>

          {fbtItems.length > 0 && (
            <div className="mt-10">
              <div className="px-1 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-700 font-headingnow leading-tight">
                  Frequently Bought Together
                </h2>
                <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                  Often purchased with this item.
                </p>
              </div>
              <ProductCarousel
                products={fbtItems}
                showMoreLink={
                  product.category
                    ? `/products?category=${encodeURIComponent(product.category)}`
                    : '/products'
                }
              />
            </div>
          )}

          {similarItems.length > 0 && (
            <div className="mt-10 mb-4">
              <div className="flex items-end justify-between gap-3 mb-4 px-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-700 font-headingnow leading-tight">
                    Similar Products
                  </h2>
                  <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                    More you might like in this range.
                  </p>
                </div>
                <Link
                  href={
                    product.category
                      ? `/products?category=${encodeURIComponent(product.category)}`
                      : '/products'
                  }
                  className="text-[12px] font-medium text-violet-700 hover:text-violet-800 transition whitespace-nowrap"
                >
                  View All
                </Link>
              </div>
              <ProductCarousel
                products={similarItems}
                showMoreLink={
                  product.category
                    ? `/products?category=${encodeURIComponent(product.category)}`
                    : '/products'
                }
              />
            </div>
          )}
        </Container>
      </div>

      <FloatingViewCartPill />
    </div>
  );
}
