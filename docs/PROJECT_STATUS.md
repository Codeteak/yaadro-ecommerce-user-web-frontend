# Yaadro Storefront — Project Status

**Updated:** 2026-11-17

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Catalog, OTP login, profile, coupons, orders, and checkout call the customer API on branch `alan-new`. The basket and wishlist stay on the device. Server cart writes are retired (410).

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Hero, swipe CTA, guest link |
| Login `/login` | UI done | Phone +91 / OTP; API pending |
| Home / catalog | Live database | Categories, products, product detail, and home shelves are read on the server from `DATABASE_URL` with the shop API's filters. Shop name and SEO still use the customer API, with a Yaadro fallback. Offer prices come from the product row. Campaign overlays are not copied. `/categories` and `/categories/[slug]` use horizontal HomeSearchBar + pill CategoryRail (legacy sidebars kept on playground `category-browser` / `category-plp`). |
| Cart `/cart` | UI done | List, promo field, 3D Checkout pill (checkout not faked). “You may also like” uses the live catalog. |
| Coupons `/coupons` | UI done | Comfortable ticket body (discount → title → code); sample via `lib/api/coupons` |
| Wishlist `/wishlist` | UI done | Local signed-in scaffold; façade `lib/api/wishlist` |
| Checkout `/checkout` | UI done | COD only; Place Order → Order placed (mascot + bill card + View Order / Back home); stub only |
| Order placed | Done | Shared `OrderPlacedContent`; playground `/playground/order-placed` |
| Orders `/orders` | UI done | Grocery cards + ORDER STATUS detail via `lib/api/orders` |
| Toasts | Done | Island snackbars + SVG Repo icons; storefront + playground |
| Live order track | Playground | `/playground/live-order-track` — green theme; not on `/orders` yet |
| Bottom nav | Done | Home, Categories, Wishlist, Profile |
| Auth / session | Missing | Wishlist uses `previewSignedIn` until session API |
| Payment / real place-order | Missing | — |

## Routes

- `/` — onboarding
- `/login` — login stub
- `/home`, `/categories`, `/categories/[slug]`, `/wishlist`, `/profile`, `/cart`, `/coupons`, `/checkout`, `/orders`
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
- Cart promo uses sample codes only — not checkout-authoritative.
- Orders / coupons data is sample-only (no network).
- Serwist packages installed but not configured.
