# Yaadro Storefront — Project Status

**Branch:** `fayad`  
**Updated:** 2026-10-24

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Storefront UI (home, cart, coupons, wishlist) is scaffolded with sample data; auth API and checkout are not implemented.

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Hero, swipe CTA, guest link |
| Login `/login` | UI done | Phone +91 / OTP; API pending |
| Home / catalog | Sample | Categories, product cards, PDP |
| Cart `/cart` | UI done | List, promo field, 3D Checkout pill (checkout not faked) |
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
- `/home`, `/categories`, `/wishlist`, `/profile`, `/cart`, `/coupons`, `/checkout`, `/orders`
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
