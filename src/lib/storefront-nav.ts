/**
 * Bottom nav + ViewCartBar stay on the main tabs and list pages.
 * They hide on focused task screens that already have a back header.
 */
export const STOREFRONT_NAV_HIDDEN_PATHS = [
  "/cart",
  "/checkout",
  "/orders/[id]",
  "/orders/[id]/track",
  "/profile/edit",
  "/profile/addresses",
  "/profile/support",
] as const;

export function shouldHideStorefrontNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/cart" || pathname === "/checkout") return true;
  if (pathname === "/profile/edit") return true;
  if (pathname === "/profile/addresses") return true;
  if (pathname === "/profile/support") return true;
  // Order detail: /orders/<id>, not the history list itself.
  if (/^\/orders\/[^/]+$/.test(pathname)) return true;
  // Live tracking: /orders/<id>/track (separate from order details).
  if (/^\/orders\/[^/]+\/track$/.test(pathname)) return true;
  return false;
}
