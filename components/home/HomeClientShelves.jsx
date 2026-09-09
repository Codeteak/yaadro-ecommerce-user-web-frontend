'use client';

import { useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useInfiniteOrdersList } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { dedupeProductsByVariantGroup, getPopularityScore } from '../../utils/productUtils';
import { getBuyAgainFavorites } from '../../utils/buyAgainRecommendations';
import HomeProductShelf from './HomeProductShelf';

const FEATURED_TITLE = 'Featured Products';
const BEST_SELLERS_TITLE = 'Best Sellers';
const BUY_AGAIN_TITLE = 'Buy Again';

export default function HomeClientShelves({ products: productsProp } = {}) {
  const { isAuthenticated } = useAuth();

  const needsFallbackFetch = !Array.isArray(productsProp) || productsProp.length === 0;

  const { data: catalogData } = useProducts({
    limit: 48,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: needsFallbackFetch,
  });

  const catalogProducts = useMemo(() => {
    if (Array.isArray(productsProp) && productsProp.length > 0) {
      return dedupeProductsByVariantGroup(productsProp);
    }
    return dedupeProductsByVariantGroup(catalogData?.products || []);
  }, [productsProp, catalogData?.products]);

  const featuredProducts = useMemo(() => {
    const flagged = catalogProducts.filter((p) => p?.isFeatured);
    if (flagged.length) return flagged.slice(0, 8);
    return catalogProducts.slice(0, 8);
  }, [catalogProducts]);

  const bestSellerProducts = useMemo(() => {
    if (!catalogProducts.length) return [];
    const featuredIds = new Set(featuredProducts.map((p) => String(p.id)));
    const ranked = [...catalogProducts].sort(
      (a, b) => getPopularityScore(b) - getPopularityScore(a)
    );
    const preferred = ranked.filter((p) => !featuredIds.has(String(p.id)));
    const fill = ranked.filter((p) => featuredIds.has(String(p.id)));
    return [...preferred, ...fill].slice(0, 8);
  }, [catalogProducts, featuredProducts]);

  const { data: ordersInfinite } = useInfiniteOrdersList(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  const orders = useMemo(
    () => (ordersInfinite?.pages || []).flatMap((p) => p?.orders || []),
    [ordersInfinite?.pages]
  );

  const { data: recommendPoolData } = useProducts({
    limit: 60,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: isAuthenticated && orders.length > 0,
  });

  const buyAgainProducts = useMemo(() => {
    if (!isAuthenticated || !orders.length) return [];
    const pool =
      recommendPoolData?.products?.length > 0
        ? recommendPoolData.products
        : catalogProducts;
    return getBuyAgainFavorites(pool, orders, { limit: 12 });
  }, [isAuthenticated, orders, recommendPoolData?.products, catalogProducts]);

  if (
    !featuredProducts.length &&
    !bestSellerProducts.length &&
    !buyAgainProducts.length
  ) {
    return null;
  }

  return (
    <div>
      {featuredProducts.length > 0 ? (
        <HomeProductShelf
          title={FEATURED_TITLE}
          products={featuredProducts}
          tone="plain"
        />
      ) : null}
      {bestSellerProducts.length > 0 ? (
        <HomeProductShelf
          title={BEST_SELLERS_TITLE}
          products={bestSellerProducts}
          tone="plain"
        />
      ) : null}
      {buyAgainProducts.length > 0 ? (
        <HomeProductShelf
          title={BUY_AGAIN_TITLE}
          products={buyAgainProducts}
          tone="plain"
        />
      ) : null}
    </div>
  );
}
