'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProductWithRelated, useProducts } from '../../../hooks/useProducts';
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
import {
  getProductRating,
  getProductDiscount,
  getEffectivePrice,
  formatRupeeINR,
  formatBundleRuleLabel,
  formatWeightUnitLabel,
  getPrimaryBundleRule,
  resolveProductWeightAndUnit,
  stripPackFromProductName,
} from '../../../utils/productUtils';
import Container from '../../../components/Container';
import ProductDetailSkeleton from '../../../components/ProductDetailSkeleton';
import Link from 'next/link';
import ProductCarousel from '../../../components/ProductCarousel';
import { SHOW_PRODUCT_EXTENDED_SECTIONS } from './productDetailFlags';
import { getResolvedProductImageUrls } from '../../../utils/productImages';
import ProductImageWithFallback from '../../../components/ProductImageWithFallback';
import FloatingViewCartPill from '../../../components/FloatingViewCartPill';
import { getCartLineDisplayQty, getBundleFreeExtraOnPaidLine } from '../../../utils/cartPromotions';
import { findPaidCartLine } from '../../../utils/cartLinePersist';
import { getProductDetailPath, normalizeProductRouteParam, resolveProductDetailSegment } from '../../../utils/productApi';

/** Gap between cart pill bottom and the top edge of the PDP fixed bottom bar. */
const CART_PILL_GAP_ABOVE_PDP_BAR_PX = 12;

function PillTag({ children, color = 'green' }) {
  const colorMap = {
    green: 'bg-emerald-100 text-emerald-800',
    orange: 'bg-amber-100 text-amber-800',
    discountGreen: 'bg-green-600 text-white shadow-sm font-bold',
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

/** Matches home page section typography (e.g. Buy Again / Best Sellers blocks). */
function DetailSectionTitle({ children }) {
  return (
    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
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
  const { addToCart, cartItems, cartTotal, cartCount, updateQuantity, removeFromCart } = useCart();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { showAlert } = useAlert();
  const { shopName } = useShopBranding();

  const [cartActionLoading, setCartActionLoading] = useState(false);

  const resolvedId =
    productId != null
      ? normalizeProductRouteParam(productId)
      : normalizeProductRouteParam(params?.id ?? params?.slug);
  const { data: productData, isLoading: loading } = useProductWithRelated(resolvedId);
  const product = productData?.product || null;
  const relatedProducts = productData?.relatedProducts || [];

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

  const pdpBottomBarRef = useRef(null);
  /** CSS `bottom` (px) so the cart pill sits above the PDP bar, from the bar's top edge + gap. */
  const [cartPillStackBottomPx, setCartPillStackBottomPx] = useState(120);

  const availableSizes =
    product?.sizes ||
    (product?.weight && product?.unit
      ? [{ weight: product.weight, unit: product.unit, price: parseFloat(product.price) }]
      : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);

  const listUnit = selectedSize
    ? parseFloat(selectedSize.price)
    : product
    ? parseFloat(product.price)
    : 0;
  const resolvedPack = product ? resolveProductWeightAndUnit(product) : { weight: null, unit: '' };
  const displayWeight = selectedSize
    ? formatWeightUnitLabel(selectedSize.weight, selectedSize.unit)
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
  const effectivePrice = product ? getEffectivePrice(product, listUnit) : 0;
  const mrpDisplay =
    product && effectivePrice < listUnit - 1e-9
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
  // Pool of products used to fill Similar / FBT when the API returns nothing.
  // Reuses the same cached query as the home page (limit 50, newest first) → no extra network on most navigations.
  const { data: fallbackPoolData } = useProducts({
    limit: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const fallbackPool = fallbackPoolData?.products || [];

  const shuffleArray = (input) => {
    const arr = Array.isArray(input) ? [...input] : [];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const similarItems = useMemo(() => {
    if (Array.isArray(relatedProducts) && relatedProducts.length > 0) return relatedProducts;
    if (!product?.id || fallbackPool.length === 0) return [];
    const exclude = new Set([String(product.id)]);
    const candidates = fallbackPool.filter((p) => p?.id != null && !exclude.has(String(p.id)));
    return shuffleArray(candidates).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedProducts, fallbackPool, product?.id]);

  const fbtItems = useMemo(() => {
    const apiFBT = product?.frequentlyBoughtTogether;
    if (Array.isArray(apiFBT) && apiFBT.length > 0) return apiFBT;
    if (!product?.id || fallbackPool.length === 0) return [];
    const exclude = new Set([
      String(product.id),
      ...similarItems.map((p) => (p?.id != null ? String(p.id) : '')).filter(Boolean),
    ]);
    const candidates = fallbackPool.filter((p) => p?.id != null && !exclude.has(String(p.id)));
    return shuffleArray(candidates).slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.frequentlyBoughtTogether, fallbackPool, product?.id, similarItems]);

  const productToAddPayload = useMemo(
    () =>
      product
        ? {
            ...product,
            price: effectivePrice,
            ...(mrpDisplay != null ? { originalPrice: mrpDisplay } : {}),
            selectedSize,
            sizeDisplay: displayWeight,
          }
        : null,
    [product, effectivePrice, mrpDisplay, selectedSize, displayWeight]
  );

  const cartLine = useMemo(
    () => (product ? findPaidCartLine(cartItems, product.id, selectedSize) : null),
    [cartItems, product, selectedSize]
  );

  const paidCartQty = cartLine?.quantity ?? 0;
  const cartBadgeQty = cartLine ? getCartLineDisplayQty(cartLine) : 0;
  const cartQty = paidCartQty;
  const bundleFreeExtra =
    cartLine && !cartLine.isBundleReward ? getBundleFreeExtraOnPaidLine(cartLine) : 0;
  const cartUpdateKey = cartLine
    ? cartLine.cartItemKey ?? cartLine.cartItemId ?? cartLine.id
    : null;

  const lineSubtotal = formatRupeeINR(effectivePrice * (cartQty || 0));

  useLayoutEffect(() => {
    const el = pdpBottomBarRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vv = window.visualViewport;
      const visibleBottomY = vv ? vv.offsetTop + vv.height : window.innerHeight;
      // CSS `bottom` on the pill: distance from viewport bottom to pill bottom — from bar top + gap.
      const fromBarTop = Math.ceil(visibleBottomY - rect.top + CART_PILL_GAP_ABOVE_PDP_BAR_PX);
      const fromBarHeight = Math.ceil(rect.height + CART_PILL_GAP_ABOVE_PDP_BAR_PX);
      setCartPillStackBottomPx(Math.max(fromBarTop, fromBarHeight));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
    };
  }, [cartQty, cartCount, product?.id]);

  const handleAddToCart = useCallback(async () => {
    if (!productToAddPayload || !product?.inStock) return;
    setCartActionLoading(true);
    try {
      await addToCart(productToAddPayload, 1);
    } finally {
      setCartActionLoading(false);
    }
  }, [addToCart, productToAddPayload, product?.inStock]);

  const handleStepperIncrement = useCallback(() => {
    if (cartActionLoading || !productToAddPayload || cartUpdateKey == null) return;
    if (cartQty >= 10) return;
    updateQuantity(cartUpdateKey, cartQty + 1);
  }, [cartActionLoading, productToAddPayload, cartUpdateKey, cartQty, updateQuantity]);

  const handleStepperDecrement = useCallback(() => {
    if (cartActionLoading || cartUpdateKey == null || cartQty <= 0) return;
    if (cartQty <= 1) {
      removeFromCart(cartUpdateKey);
    } else {
      updateQuantity(cartUpdateKey, cartQty - 1);
    }
  }, [cartActionLoading, cartUpdateKey, cartQty, removeFromCart, updateQuantity]);

  const handleShare = async () => {
    const url = buildProductShareUrl(product, resolvedId);
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showAlert('Link copied to clipboard.', 'Copied', 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share.', 'Error', 'error');
    }
  };

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
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-700 transition"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-gray-50 pb-28">
      <section className="relative w-full bg-white overflow-hidden pb-6">
        <div
          className="relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {galleryUrls.map((img, idx) => (
              <div
                key={`${idx}-${img}`}
                className="flex w-full flex-shrink-0 items-center justify-center bg-white min-h-[min(58vh,62svh)] sm:min-h-[64vh] md:min-h-[70vh]"
              >
                <ProductImageWithFallback
                  src={img}
                  alt={`${product.name} – image ${idx + 1}`}
                  width={1600}
                  height={1600}
                  className="h-auto w-full max-h-[min(90vh,140vw)] object-contain sm:max-h-[min(86vh,95vw)] md:max-h-[min(82vh,56rem)]"
                  sizes="100vw"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-10" aria-hidden />
        </div>

        {galleryUrls.length > 1 && (
          <>
            <button onClick={goToPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm z-20" aria-label="Previous">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goToNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm z-20" aria-label="Next">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {galleryUrls.length > 1 && (
          <div className="mt-2 flex justify-center px-3">
            <div className="flex max-w-full gap-2 overflow-x-auto py-1" role="tablist" aria-label="Product images">
              {galleryUrls.map((u, idx) => (
                <button
                  key={`thumb-${idx}-${u}`}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentImageIndex}
                  aria-label={`Show image ${idx + 1}`}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    idx === currentImageIndex ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-gray-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <ProductImageWithFallback
                    src={u}
                    alt={`${product.name} – thumbnail ${idx + 1}`}
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="relative z-10 bg-white rounded-t-3xl pt-6 pb-2">
        <Container>
          <div className="max-w-2xl mx-auto">
            <section
              className="space-y-5 border-b border-gray-100 pb-6 mb-6"
              aria-label="Product details"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {product.organicTag && <PillTag color="green">Organic</PillTag>}
                {product.vegNonVeg === 'veg' && <PillTag color="green">🟢 Veg</PillTag>}
                {product.vegNonVeg === 'non_veg' && <PillTag color="red">🔴 Non-veg</PillTag>}
                {discount > 0 && <PillTag color="discountGreen">{discount}% OFF</PillTag>}
                {discountValue != null && discountValue > 0 && (
                  <PillTag color="discountGreen">₹{formatRupeeINR(discountValue)} off</PillTag>
                )}
                {bundleLabel && <PillTag color="green">{bundleLabel}</PillTag>}
                {product.inStock ? (
                  <PillTag color="blue">In Stock</PillTag>
                ) : (
                  <PillTag color="red">Out of Stock</PillTag>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[28px] font-bold text-gray-900 leading-snug text-balance">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-0 gap-y-2 text-[13px] sm:text-sm text-gray-600">
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100/80">
                      <svg className="h-3 w-3 fill-emerald-600" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                      </svg>
                      {rating.toFixed(1)}
                      {product.ratingsCount > 0 && (
                        <span className="font-normal text-emerald-700/80">
                          ({product.ratingsCount})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="space-y-3 pt-0.5">
                  <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                    <span className="inline-flex min-h-[2.75rem] items-center rounded-xl bg-green-600 px-3 py-2 text-2xl font-bold text-white shadow-sm tabular-nums sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-3xl md:text-[2rem]">
                      ₹{formatRupeeINR(effectivePrice)}
                    </span>
                    {mrpDisplay != null && (
                      <div className="flex flex-col justify-center pb-0.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          MRP
                        </span>
                        <span className="text-base font-medium text-gray-400 line-through tabular-nums">
                          ₹{formatRupeeINR(mrpDisplay)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleShare()}
                      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-yellow-500 bg-yellow-100 px-3 text-[13px] font-semibold text-gray-900 shadow-sm transition hover:bg-yellow-200 sm:flex-initial sm:min-w-[7.5rem]"
                      aria-label="Share product"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAddToCart()}
                      disabled={!product.inStock || cartActionLoading}
                      className={`inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold shadow-sm transition sm:flex-initial sm:min-w-[9.5rem] ${
                        product.inStock
                          ? 'border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-70'
                          : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      }`}
                    >
                      {cartActionLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                      ) : (
                        <svg
                          className={`h-4 w-4 shrink-0 ${product.inStock ? 'text-white' : 'text-gray-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      )}
                      {product.inStock ? 'Add to cart' : 'Unavailable'}
                    </button>
                  </div>
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
                      const img = getResolvedProductImageUrls(p)[0] || '/images/dummy.png';
                      const active = product?.id && String(product.id) === String(p.id);
                      const priceValue = getEffectivePrice(p, Number(p.price ?? 0) || 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => router.push(getProductDetailPath(p))}
                          className={`flex w-[128px] shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition ${
                            active
                              ? 'border-emerald-500 ring-2 ring-emerald-200'
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
                            />
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-[14px] font-extrabold text-gray-900 leading-tight line-clamp-1">
                              {packLabel || 'Pack'}
                            </p>
                            <div className="mt-1.5">
                              <span className="inline-flex items-center rounded-full bg-green-600 px-2.5 py-1 text-[12px] font-extrabold text-white shadow-sm tabular-nums">
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

            {descriptionText ? (
              <>
                <DetailSectionTitle>Description</DetailSectionTitle>
                <p className="mt-2 text-[13px] md:text-sm text-gray-600 leading-relaxed mb-5 whitespace-pre-wrap">
                  {descriptionText}
                </p>
                <Divider />
              </>
            ) : null}

            {availableSizes.length > 1 && (
              <>
                <DetailSectionTitle>Size / Variant</DetailSectionTitle>
                <div className="flex flex-wrap gap-2 mb-5 mt-3">
                  {availableSizes.map((size, i) => {
                    const isActive =
                      selectedSize?.weight === size.weight && selectedSize?.unit === size.unit;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'
                        }`}
                      >
                        {size.weight} {size.unit} — ₹
                        {formatRupeeINR(
                          product ? getEffectivePrice(product, parseFloat(size.price)) : parseFloat(size.price)
                        )}
                      </button>
                    );
                  })}
                </div>
                <Divider />
              </>
            )}

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
                  <OfferRow iconBg="bg-emerald-100" iconColor="text-emerald-700">
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
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
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
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
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
                  className="text-[12px] font-medium text-emerald-700 hover:text-emerald-800 transition whitespace-nowrap"
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

      {/* Same sticky bottom chrome as cart page; content row uses items-start when a second summary line appears so controls sit on the top edge of the bar. */}
      <div
        ref={pdpBottomBarRef}
        id="yaadro-pdp-bottom-bar"
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 flex w-full gap-3 ${
          cartQty > 0 ? 'items-start' : 'items-center'
        }`}
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className={`flex-1 min-w-0 ${cartQty > 0 ? 'pt-0.5' : ''}`}>
          <p className="text-[11px] text-gray-400">
            {cartQty > 0 ? 'Total' : cartCount > 0 ? 'Cart total' : 'Price'}
          </p>
          <p className="text-lg font-medium text-gray-900 tabular-nums">
            ₹{(cartQty > 0 || cartCount > 0 ? cartTotal : effectivePrice).toLocaleString('en-IN')}
          </p>
          {cartQty > 0 && (
            <p className="mt-0.5 text-[11px] text-gray-400 tabular-nums">
              This item: ₹{lineSubtotal} · Qty {cartQty}
              {bundleFreeExtra > 0 ? ` (+${bundleFreeExtra} free)` : ''}
            </p>
          )}
        </div>

        {cartQty > 0 && (
          <div className="flex h-11 shrink-0 items-stretch overflow-hidden rounded-full border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => void handleStepperDecrement()}
              disabled={cartActionLoading}
              className="flex w-11 items-center justify-center bg-white text-lg font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <div className="flex min-w-[2.5rem] flex-col items-center justify-center border-x border-gray-100 bg-white px-2">
              <span className="text-sm font-bold tabular-nums leading-none text-gray-900">{cartQty}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleStepperIncrement()}
              disabled={cartActionLoading || cartQty >= 10}
              className="flex w-11 items-center justify-center bg-white text-lg font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}

        {cartQty === 0 ? (
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={!product.inStock || cartActionLoading}
            className={`flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition whitespace-nowrap active:scale-[0.98] ${
              product.inStock
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70'
                : 'cursor-not-allowed bg-gray-200 text-gray-400'
            }`}
          >
            {cartActionLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            )}
            {product.inStock ? 'Add to cart' : 'Out of stock'}
          </button>
        ) : (
          <Link
            href="/cart"
            className="flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] whitespace-nowrap"
          >
            Go to cart
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      <FloatingViewCartPill stackAboveBottomPx={cartPillStackBottomPx} />
    </div>
  );
}
