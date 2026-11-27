/**
 * Bottom nav + ViewCartBar stay on the main tabs and list pages.
 * They hide on focused task screens that already have a back header.
 */
export const STOREFRONT_NAV_HIDDEN_PATHS = [
  "/cart",
  "/checkout",
  "/dairy",
  "/festive",
  "/orders/[id]",
  "/orders/[id]/track",
  "/profile/support",
] as const;

export function shouldHideStorefrontNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/cart" || pathname === "/checkout") return true;
  if (pathname === "/dairy" || pathname === "/festive") return true;
  if (pathname === "/profile/support") return true;
  // Order detail: /orders/<id>, not the history list itself.
  if (/^\/orders\/[^/]+$/.test(pathname)) return true;
  // Live tracking: /orders/<id>/track (separate from order details).
  if (/^\/orders\/[^/]+\/track$/.test(pathname)) return true;
  return false;
}

/**
 * Categories fill the viewport with an inner scroller (not document scroll).
 * Drive chrome overflow from the URL — not `:has([data-storefront-fill])` —
 * so a View Transition exit of /categories cannot leave home unscrollable.
 */
export function isStorefrontFillPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/categories" || pathname.startsWith("/categories/");
}
