# Yaadro Storefront — Project Status

**Updated:** 2026-11-19

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Catalog, OTP login, profile, coupons, orders, and checkout call the customer API on branch `alan-new`. The basket and wishlist stay on the device. Server cart writes are retired (410).

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Hero, swipe CTA, guest link |
| Login `/login` | UI done | Phone +91 / OTP. Success island toast at the top, then returns home (or the safe `next` path). |
| Home / catalog | Live database | Categories, products, product detail, and home shelves are read on the server from `DATABASE_URL` with the shop API's filters. Shop name and SEO still use the customer API, with a Yaadro fallback. Offer prices come from the product row. Campaign overlays are not copied. |
| Cart `/cart` | UI done | List, promo field, 3D Checkout pill. The shop quote shows the minimum, automatic offers, and a trusted total (including ₹0). Checkout stays off until the minimum is met. “You may also like” uses the live catalog. |
| Coupons `/coupons` | Wired | Live list from `GET /api/storefront/coupons`; apply from cart confirms via cart/preview |
| Wishlist `/wishlist` | UI done | Local signed-in scaffold; façade `lib/api/wishlist` |
| Checkout `/checkout` | UI done | COD only; Place Order → Order placed (mascot + bill card + View Order / Back home); stub only |
| Order placed | Done | Shown after Place Order on `/checkout`; Order history + Home CTAs; playground `/playground/order-placed` |
| Orders `/orders` | UI done | Grocery cards + ORDER STATUS detail via `lib/api/orders` |
| Toasts | Done | Theme island snackbars at the top via `showPopup(message, type)` (`ToastViewport` in AppProviders) |
| Address map | Done | Select location loads Google Maps JS when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (tap/drag pin + search + detect). Details shows Embed preview. Enable Maps JavaScript, Geocoding, and Embed APIs on the key. |
| Live order track | Playground | `/playground/live-order-track` — green theme; not on `/orders` yet |
| Bottom nav | Done | Home, Categories, Wishlist, Profile |
| Auth / session | Live | Home header profile icon follows the OTP session. Wishlist still uses the session flag from `CustomerSession`. |
| Payment / real place-order | Missing | — |

## Routes

- `/` — onboarding
- `/login` — login stub
- `/home`, `/categories`, `/categories/[slug]`, `/events`, `/wishlist`, `/profile`, `/profile/support`, `/cart`, `/coupons`, `/checkout`, `/orders`
- `/orders/[id]` — classic order detail (sample)
- `/orders/[id]/track` — live tracking (separate from order details)
- `/product/[id]` — PDP
- `/playground` — UI demos
- `/manifest.webmanifest` — from `src/app/manifest.ts`

## Sample API façades

Thin modules so pages read like future clients (replace with `fetch` when APIs exist):

- `src/lib/api/orders.ts` — `listOrders()`, `getOrder(id)`
- `src/lib/api/coupons.ts` — `listCoupons()`
- `src/lib/api/wishlist.ts` — storage key + id helpers; mutations stay in `WishlistContext`

## Known limitations

- Catalog prices are the shelf price and the row offer price. Buy-one-get-one and category-offer overlays are still calculated by the customer API at checkout.
- `DATABASE_URL` must stay server-only. The catalog does not load if that variable is missing.
- Wishlist persistence is device-local (`yaadro-wishlist-v1`).
- Live cart/checkout coupon −₹ is shop-preview authoritative (`liveShopCoupons` / `liveShopPricing`). Playground still uses SAMPLE_COUPONS + local apply; `/playground/checkout-coupon` fixtures the bill row.
- Orders list can use live API when signed in; playground stays on samples.
- Serwist packages installed but not configured.
