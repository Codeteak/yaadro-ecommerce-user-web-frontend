'use client';

import { useShopBranding } from '../context/ShopBrandingContext';

/**
 * Catalog/home queries must wait for a real domain-resolved shop id so we never
 * fetch under baked-in NEXT_PUBLIC_SHOP_ID (testshop) on tenant hosts.
 */
export function useStorefrontShopGate() {
  const { shopId, isResolving } = useShopBranding();
  const ready = Boolean(shopId) && !isResolving;
  return { shopId: shopId || '', isResolving: Boolean(isResolving), ready };
}
