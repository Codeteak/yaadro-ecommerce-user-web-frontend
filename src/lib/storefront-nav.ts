/**
 * Bottom nav stays on the main tabs and list pages.
 * It hides on focused task screens that already have a back header.
 */
export const STOREFRONT_NAV_HIDDEN_PATHS = [
  "/cart",
  "/checkout",
  "/orders/[id]",
  "/profile/edit",
  "/profile/addresses",
  "/profile/settings",
  "/profile/support",
] as const;

export function shouldHideStorefrontNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/cart" || pathname === "/checkout") return true;
  if (pathname === "/profile/edit") return true;
  if (pathname === "/profile/addresses") return true;
  if (pathname === "/profile/settings") return true;
  if (pathname === "/profile/support") return true;
  // Order detail: /orders/<id>, not the history list itself.
  if (/^\/orders\/[^/]+$/.test(pathname)) return true;
  return false;
}
