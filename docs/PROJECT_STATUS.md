# Yaadro Storefront — Project Status

**Branch:** `fayad`  
**Updated:** 2026-11-06

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Home, categories, and the product page read the public customer catalog. Auth, cart pricing, coupons, and checkout are still local/sample.

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Hero, swipe CTA, guest link |
| Login `/login` | UI done | Phone +91 / OTP; API pending |
| Home / catalog | Live public API | Shop SEO, categories, products, home shelves. A category with no photo uses the grocery-bag placeholder. Sample banners stay when the shop has none. Playground still uses samples. |
| Cart `/cart` | UI done | List, promo field, 3D Checkout pill (checkout not faked). “You may also like” uses the live catalog. |
| Coupons `/coupons` | UI done | Ticket cards via `lib/api/coupons`; Active/Used/Expired |
| Wishlist `/wishlist` | UI done | Local signed-in scaffold; façade `lib/api/wishlist` |
| Checkout `/checkout` | UI done | COD only; sample promo; Place Order is UI stub |
| Orders `/orders` | UI done | Grocery cards + ORDER STATUS detail via `lib/api/orders` |
| Bottom nav | Done | Home, Categories, Wishlist, Profile |
| Auth / session | Missing | Wishlist uses `previewSignedIn` until session API |
| Payment / real place-order | Missing | — |

## Routes

- `/` — onboarding
- `/login` — login stub
- `/home`, `/categories`, `/categories/[slug]`, `/wishlist`, `/profile`, `/cart`, `/coupons`, `/checkout`, `/orders`
- `/orders/[id]` — order detail (sample)
- `/product/[id]` — PDP
- `/playground` — UI demos
- `/manifest.webmanifest` — from `src/app/manifest.ts`

## Sample API façades

Thin modules so pages read like future clients (replace with `fetch` when APIs exist):

- `src/lib/api/orders.ts` — `listOrders()`, `getOrder(id)`
- `src/lib/api/coupons.ts` — `listCoupons()`
- `src/lib/api/wishlist.ts` — storage key + id helpers; mutations stay in `WishlistContext`

## Known limitations

- No auth backend; wishlist persistence is device-local (`yaadro-wishlist-v1`).
- Cart promo uses sample codes only — not checkout-authoritative.
- Orders / coupons data is sample-only (no network).
- Serwist packages installed but not configured.
