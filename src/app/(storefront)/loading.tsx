import { StorefrontRouteShell } from "@/components/ui/skeletons";

/**
 * Route-transition shell only — chrome bones, not a full product-grid skeleton.
 * Pages stream their own sections via Suspense (home hero/catalog, dairy/festive, PLP).
 */
export default function StorefrontLoading() {
  return <StorefrontRouteShell />;
}
