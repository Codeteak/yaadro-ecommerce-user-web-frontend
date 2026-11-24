# Yaadro Storefront — Project Status

**Updated:** 2026-11-24 (cart bill from shop preview; shared CartBill; qty cap 10)

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Catalog, OTP login, profile, coupons, orders, and checkout call the customer API. Basket and wishlist are device-local and shop-scoped. Server cart writes are retired (410).

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Redirects to `/home` |
| Login `/login` | Live | Phone +91 / OTP. Refresh token in localStorage (~50 days). |
| Home / catalog | Live database | Categories, products, PDP, shelves from `DATABASE_URL`. Domain resolve + banners when host is not local. Empty banners stay hidden. |
| Search | Wired | Home → `/categories` (prefetched). Typing filters locally, then debounced server search; `?q=` syncs without remount. Warm uses same browse page size (48). |
| Cart `/cart` | Live | Shop-scoped basket; bill from cart preview (To pay + saves); typed coupons; free bundle section; qty cap 10 |
| Coupons `/coupons` | Wired | Live list from `GET /api/storefront/coupons` |
| Wishlist `/wishlist` | Done | Shop-scoped local storage |
| Checkout `/checkout` | Live | COD via `POST /api/storefront/checkout` with storefront cookies (`credentials: include`) |
| Order placed | Done | Inline on `/checkout` after Place Order |
| Orders `/orders` | Live when signed in | Customer API list/detail |
| Address | Live | One address; server sync on login + save; Google map + Nominatim fallback |
| PWA | Wired | `public/sw.js`, install prompt, manifest uses shop image when available |
| Auth / session | Live | OTP + refresh; Deliver-to hydrates from server address |
| Payment | COD only | Same as main (no card gateway) |
| CI/CD | Restored | GitHub Actions → `customer-web-pipeline` (OIDC); Docker/CodeDeploy; optional CF Pages static export |

## Routes

- `/` → `/home`
- `/login`
- `/home`, `/categories`, `/categories/[slug]`, `/dairy`, `/festive`, `/events`, `/wishlist`, `/profile`, `/profile/support`, `/cart`, `/coupons`, `/checkout`, `/orders`
- `/orders/[id]`, `/orders/[id]/track`
- `/product/[id]`
- `/new`, `/trending` → `/home`
- `/playground` — UI demos (blocked in production)
- `/manifest.webmanifest`

## Sample API façades

Thin modules so pages read like future clients (replace with `fetch` when APIs exist):

- `src/lib/api/orders.ts` — `listOrders()`, `getOrder(id)`
- `src/lib/api/coupons.ts` — `listCoupons()`
- `src/lib/api/wishlist.ts` — storage key + id helpers; mutations stay in `WishlistContext`

## In progress / plans

- Multi-phone layout (SE vs Pro Max card density + profile scroll): see `MULTI_PHONE_LAYOUT_PLAN.md` (repo root, next to `test.md`).

## Known limitations

- Catalog prices are the shelf price and the row offer price. Buy-one-get-one and category-offer overlays are still calculated by the customer API at checkout.
- `DATABASE_URL` must stay server-only. The catalog does not load if that variable is missing.
- Multi-shop: catalog uses the shop resolved from the request hostname; `NEXT_PUBLIC_DEFAULT_SHOP_ID` is local/fallback only.
- Wishlist / cart keys are shop-scoped (`yaadro_wishlist_<shopId>`, `yaadro_cart_<shopId>`). Legacy unscoped keys are not migrated.
- Live cart/checkout coupon −₹ is shop-preview authoritative. Playground still uses SAMPLE_COUPONS.
- Orders list uses live API when signed in; playground stays on samples.
- PWA uses a hand-rolled `public/sw.js` + install prompt (Serwist package still unused).
