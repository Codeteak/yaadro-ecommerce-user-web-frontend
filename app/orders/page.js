'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useInfiniteOrdersList } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { cartKeys } from '../../hooks/useCart';
import { getCart } from '../../utils/cartApi';
import { useAlert } from '../../context/AlertContext';
import PageTopBar from '../../components/PageTopBar';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import GuestAuthPrompt from '../../components/GuestAuthPrompt';
import ProductCarousel from '../../components/ProductCarousel';
import InfiniteScrollSentinel from '../../components/InfiniteScrollSentinel';
import EarlyPrefetchSentinel from '../../components/orders/EarlyPrefetchSentinel';
import OrderCard from '../../components/orders/OrderCard';
import { PackageRegular as Package } from '../../components/icons';
import OrdersPageSkeleton from '../../components/skeletons/OrdersPageSkeleton';
import { OrderListCardSkeleton } from '../../components/skeletons/primitives';

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { ok, ready } = useRequireAuth();
  const {
    data: ordersInfinite,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteOrdersList({ limit: 100 }, { enabled: ok });
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const [reorderLoadingId, setReorderLoadingId] = useState(null);
  const reorderLoadingIdRef = useRef(null);
  reorderLoadingIdRef.current = reorderLoadingId;

  const orders = useMemo(
    () => (ordersInfinite?.pages || []).flatMap((p) => p?.orders || []),
    [ordersInfinite?.pages]
  );
  const allOrderedItems = useMemo(
    () => orders.flatMap((o) => (Array.isArray(o.items) ? o.items : [])),
    [orders]
  );
  const prefetchIndex = Math.max(0, orders.length - 5);

  const { data: recommendPoolData } = useProducts({
    limit: 60,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: ok && orders.length > 0,
  });
  const recommendPool = recommendPoolData?.products || [];
  const orderedProductIds = useMemo(
    () =>
      new Set(
        allOrderedItems
          .map((item) => item?.productId ?? item?.product?.id ?? item?.id)
          .filter((id) => id != null)
          .map((id) => String(id))
      ),
    [allOrderedItems]
  );
  const orderedCategoryNames = useMemo(() => {
    const names = new Set();
    allOrderedItems.forEach((item) => {
      const cat = (
        item?.category?.name ??
        item?.category ??
        item?.categoryName ??
        item?.product?.category?.name ??
        item?.product?.category ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();
      if (cat) names.add(cat);
    });
    return names;
  }, [allOrderedItems]);

  const { similarProducts, buyAgainFavorites, trendingPicks } = useMemo(() => {
    const empty = { similarProducts: [], buyAgainFavorites: [], trendingPicks: [] };
    if (!recommendPool.length) return empty;

    const eligible = recommendPool.filter((p) => p?.id != null && !orderedProductIds.has(String(p.id)));
    if (!eligible.length) return empty;

    const poolIndex = new Map(eligible.map((p, i) => [String(p.id), i]));

    const productCategoryKey = (p) =>
      (
        p?.category?.name ??
        p?.category ??
        p?.categoryName ??
        p?.category_name ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();

    const matchesOrderedCategory = (p) => {
      const c = productCategoryKey(p);
      return Boolean(c && orderedCategoryNames.has(c));
    };

    const orderedNameTokens = new Set(
      allOrderedItems
        .map((item) => item?.productName ?? item?.name ?? '')
        .map((name) => String(name).trim().toLowerCase())
        .filter(Boolean)
        .flatMap((name) => name.split(/\s+/).filter((w) => w.length >= 4))
    );

    const nameTokenHits = (p) => {
      const name = (p?.name ?? '').toString().trim().toLowerCase();
      if (!name || orderedNameTokens.size === 0) return 0;
      let hits = 0;
      for (const t of orderedNameTokens) {
        if (name.includes(t)) hits += 1;
      }
      return hits;
    };

    const sortByNewest = (a, b) => (poolIndex.get(String(a.id)) ?? 0) - (poolIndex.get(String(b.id)) ?? 0);

    const takeUnique = (sorted, used, limit) => {
      const out = [];
      for (const p of sorted) {
        if (out.length >= limit) break;
        const id = String(p.id);
        if (used.has(id)) continue;
        used.add(id);
        out.push(p);
      }
      return out;
    };

    const used = new Set();

    const similarCandidates = eligible.filter(matchesOrderedCategory);
    const similarSorted = [...similarCandidates].sort((a, b) => {
      const nt = nameTokenHits(b) - nameTokenHits(a);
      if (nt !== 0) return nt;
      return sortByNewest(a, b);
    });
    const similarProducts = takeUnique(similarSorted, used, 12);

    const remainingAfterSimilar = eligible.filter((p) => !used.has(String(p.id)));
    const buyAgainScore = (p) => nameTokenHits(p) * 4 + (matchesOrderedCategory(p) ? 1 : 0);
    const buyAgainSorted = [...remainingAfterSimilar].sort((a, b) => {
      const s = buyAgainScore(b) - buyAgainScore(a);
      if (s !== 0) return s;
      return sortByNewest(a, b);
    });
    const buyAgainFavorites = takeUnique(buyAgainSorted, used, 12);

    const remainingAfterBuyAgain = eligible.filter((p) => !used.has(String(p.id)));
    const trendingSorted = [...remainingAfterBuyAgain].sort(sortByNewest);
    const trendingPicks = takeUnique(trendingSorted, used, 12);

    return { similarProducts, buyAgainFavorites, trendingPicks };
  }, [recommendPool, orderedProductIds, orderedCategoryNames, allOrderedItems]);

  const orderItemToCartProduct = useCallback((item) => {
    const qty = Number(item?.quantity ?? 1) || 1;
    const unitPriceRaw =
      item?.unitPrice ??
      item?.price ??
      (item?.totalPrice != null ? Number(item.totalPrice) / qty : null);
    const unitPrice = Number(unitPriceRaw);

    const id =
      item?.product?.id ??
      item?.productId ??
      item?.product_id ??
      item?.productUUID ??
      item?.productUuid ??
      item?.id;

    const name = item?.productName ?? item?.name ?? item?.product?.name ?? 'Item';
    const image =
      item?.product?.images?.[0] ||
      (typeof item?.image === 'string' ? item.image : item?.image?.url) ||
      '/images/dummy.png';

    const selectedSize =
      item?.selectedSize ||
      (item?.weight && item?.unit
        ? { weight: item.weight, unit: item.unit, price: Number.isFinite(unitPrice) ? unitPrice : undefined }
        : null);

    return {
      id,
      productId: id,
      name,
      image,
      price: Number.isFinite(unitPrice) ? unitPrice : 0,
      originalPrice: item?.originalPrice ?? item?.mrp ?? item?.listPrice ?? undefined,
      selectedSize: selectedSize || undefined,
      sizeDisplay: item?.sizeDisplay || item?.packLabel || undefined,
      weight: item?.weight ?? item?.unitSize ?? undefined,
      unit: item?.unit || undefined,
      unit_size: item?.unitSize ?? item?.unit_size ?? undefined,
      brand: item?.brand || item?.product?.brand || undefined,
      category: item?.category || item?.product?.category || undefined,
    };
  }, []);

  const handleReorder = useCallback(
    async (order) => {
      const items = order?.items || [];
      if (!items.length) {
        showAlert('No items found in this order.', 'Reorder', 'warning');
        return;
      }
      if (reorderLoadingIdRef.current === order?.id) return;
      setReorderLoadingId(order?.id ?? null);
      try {
        for (const item of items) {
          const qty = Number(item?.quantity ?? 1) || 1;
          const product = orderItemToCartProduct(item);
          await addToCart(product, qty);
        }
        if (isAuthenticated) {
          try {
            await queryClient.fetchQuery({
              queryKey: cartKeys.cart(),
              queryFn: getCart,
            });
          } catch (e) {
            console.error('Cart refresh after reorder:', e);
          }
        }
        showAlert('Items added to cart!', 'Success', 'success');
        router.push('/cart');
      } catch (e) {
        showAlert(e?.message || 'Failed to reorder. Please try again.', 'Error', 'error');
      } finally {
        setReorderLoadingId(null);
      }
    },
    [addToCart, isAuthenticated, orderItemToCartProduct, queryClient, router, showAlert]
  );

  const handleOpenDetails = useCallback(
    (orderId) => {
      router.push(`/order?id=${encodeURIComponent(orderId)}`);
    },
    [router]
  );

  const handleShareCopied = useCallback(() => {
    showAlert('Order link copied to clipboard!', 'Success', 'success');
  }, [showAlert]);

  if (!ready) {
    return <OrdersPageSkeleton />;
  }

  if (!ok) {
    return (
      <GuestAuthPrompt
        pageTitle="Your Orders"
        backHref="/profile"
        fallbackHref="/"
        description="Sign in to view your order history."
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBar title="Your Orders" backHref="/profile" fallbackHref="/" />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <OrderListCardSkeleton key={i} />
            ))}
          </>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-red-500 font-medium mb-2">Error loading orders</p>
            <p className="text-gray-500 text-sm">{error.message}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <Package size={56} className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <p className="mb-4 font-medium text-gray-600">No orders yet</p>
            <Link href="/products" className="text-sm font-semibold text-primary hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            {orders.map((order, index) => (
              <div key={order.id}>
                {index === prefetchIndex && hasNextPage ? (
                  <EarlyPrefetchSentinel
                    enabled={!!hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    rootMargin="640px 0px"
                  />
                ) : null}
                <OrderCard
                  order={order}
                  reorderLoading={reorderLoadingId === order.id}
                  onOpenDetails={handleOpenDetails}
                  onReorder={handleReorder}
                  onShareCopied={handleShareCopied}
                />
              </div>
            ))}
            <InfiniteScrollSentinel
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              showSkeleton={false}
              endLabel="No more orders"
              showEndLabel={orders.length > 0 && !hasNextPage}
              rootMargin="280px 0px"
            />
            {isFetchingNextPage && (
              <div className="space-y-4">
                <OrderListCardSkeleton />
                <OrderListCardSkeleton />
              </div>
            )}
          </>
        )}

        {orders.length > 0 && similarProducts.length > 0 && (
          <section className="mt-2" aria-label="Similar products">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Similar Products
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                Based on your order history.
              </p>
            </div>
            <ProductCarousel products={similarProducts} showMoreLink="/products" />
          </section>
        )}

        {orders.length > 0 && buyAgainFavorites.length > 0 && (
          <section className="mt-4" aria-label="Buy again favorites">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Buy Again Favorites
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                Top picks close to items you already purchased.
              </p>
            </div>
            <ProductCarousel products={buyAgainFavorites} showMoreLink="/products" />
          </section>
        )}

        {orders.length > 0 && trendingPicks.length > 0 && (
          <section className="mt-4" aria-label="Trending picks">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Trending Picks
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                New and popular products you might like.
              </p>
            </div>
            <ProductCarousel products={trendingPicks} showMoreLink="/products" />
          </section>
        )}
      </div>
    </div>
  );
}
