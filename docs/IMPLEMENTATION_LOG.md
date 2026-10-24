# Implementation Log

## 2026-10-19 — Onboarding home-login UI

### What was built

- `/` onboarding screen: leaf logo, split headline, tote hero, single slide indicator, swipe-to-login, continue without login
- `/login` style-matched empty stub
- `/home` guest “storefront coming soon” stub
- Design tokens updated for paper / leaf / forest palette

### Files

| Path | Change |
|------|--------|
| `src/app/page.tsx` | Onboarding entry |
| `src/app/layout.tsx` | Metadata / theme color |
| `src/app/globals.css` | Tokens + light motion |
| `src/app/login/page.tsx` | Login stub |
| `src/app/home/page.tsx` | Guest home stub |
| `src/components/onboarding/OnboardingScreen.tsx` | Layout |
| `src/components/onboarding/SwipeToLogin.tsx` | Drag / keyboard CTA |
| `public/onboarding/*` | Hero, leaf, cart assets |
| `docs/PROJECT_STATUS.md` | Status baseline |
| `docs/IMPLEMENTATION_LOG.md` | This log |

### Verification

- `npm run lint` — pass
- `npm run build` — pass (Next.js 16.4.2); routes `/`, `/login`, `/home`, `/manifest.webmanifest`

### Next

- Confirm auth API contract
- Replace generated hero with final photography if provided
- Implement real login form on `/login`

## 2026-10-19 — Exact onboarding visual match

### What changed

- Replaced generated tote hero with a crop from the provided Dribbble/reference mock (`image-6e907ba3…jpg` → `public/onboarding/tote-hero.jpg`)
- Rebuilt `/` as a centered mobile composition (no two-column desktop split)
- Headline: forest “Fresh Groceries,” + bright green “Right at Your Door” on two lines
- Three static pagination dots; green cart icon; white track arrow; organic corner washes + floating leaf accents
- Tokens aligned to mock greens (`#064E3B`, `#22C55E`, pale mint paper)

### Verification

- `npm run lint` — pass
- `npm run build` — pass

### Note

- Hero is cropped from the phone mock (bezel/UI chrome excluded). An official isolated export can replace `public/onboarding/tote-hero.jpg` without code changes.

## 2026-10-19 — Onboarding polish (transparent hero, swipe reset, scale)

### What changed

- Converted hero to `public/onboarding/tote-hero.png` with mint/white page fill keyed to alpha (no opaque rectangle)
- Removed CSS mint underlay circle under the hero
- `SwipeToLogin` resets on mount / pathname / `pageshow` (bfcache) so Back no longer leaves the handle stuck
- Larger headline (`2.25rem` / `2.6rem`) and hero (`max-w` 26–28rem)

### Verification

- `npm run lint` — pass
- `npm run build` — pass
- `tote-hero.png` confirmed `hasAlpha: true`

## 2026-10-19 — Fix hero checkerboard / side bars

### Cause

`tote-hero.png` had a **baked-in gray/white checkerboard** (export artifact), not real transparency — that read as side bars / a changed framed look.

### Fix

- Flood-cleared checker tiles to alpha, trimmed bounds (`1068×942`)
- Soft mint circular glow behind the cutout; `unoptimized` Image to preserve PNG alpha

## 2026-10-19 — Motion polish (verified, swipe, hero, corners)

### What changed

- Stronger organic green accents top-left / bottom-right (`GreenCornerAccents`)
- Larger floating tote hero (`onboarding-hero-float`)
- Swipe idle hint, progress fill, complete pulse
- OTP success → Verified check animation → `/home`
- `prefers-reduced-motion` disables looping motion

### Verification

- `npm run lint` — pass
- `npm run build` — pass

## 2026-10-19 — Login UI (phone + 4-digit OTP)

### What was built

- `/login` phone step: India flag + `+91`, 10-digit validation, placeholder `98****6789`
- OTP step: 4 highlighted digit boxes, paste/autofill, resend / change number
- Verify navigates to `/home` (UI stub — no auth API yet)

### Files

| Path | Role |
|------|------|
| `src/app/login/page.tsx` | Login shell |
| `src/features/auth/LoginForm.tsx` | Phone → OTP flow |
| `src/features/auth/PhoneInput.tsx` | +91 input |
| `src/features/auth/OtpInput.tsx` | 4-box OTP |
| `src/lib/validations/auth.ts` | Zod phone/OTP |
| `src/lib/cn.ts` | className helper |

### Verification

- `npm run lint` — pass
- `npm run build` — pass

### Next

- Wire `requestOtp` / `verifyOtp` API + session tokens

## 2026-10-19 — Use corrected tote-hero.png

### What changed

- Adopted user-supplied `public/onboarding/tote-hero.png` (1536×1024, alpha)
- Cleared residual opaque black fringe pixels to full transparency
- Updated `OnboardingScreen` image dimensions and slightly larger hero `max-w` (28–32rem)

## 2026-10-19 — Floating storefront bottom nav

### What changed

- Added floating pill `BottomNav` (Home, Categories, Wishlist, Profile) matching reference: active forest pill with icon+label, inactive outline icons only
- Introduced `(storefront)` route group layout with safe-area bottom padding
- Moved `/home` into the group; added stub `/categories`, `/wishlist`, `/profile`

### Verification

- `npx next build` — pass; routes include `/home`, `/categories`, `/wishlist`, `/profile`

## 2026-10-19 — Login bottom sheet over shared hero

### What changed

- Swipe-to-login opens a bottom sheet instead of a hard page swap; tote hero stays mounted
- `LoginSheet` slides up with `LoginForm`; Back / Escape / history dismisses
- `/login` deep links render the same `OnboardingScreen` with sheet open initially
- URL sync via `history.pushState` / `replaceState` so the hero is not remounted on swipe

### Verification

- `npx next build` — pass

## 2026-10-23 — Playground Product Detail (PDP)

### What was built

- `ProductDetail` + peeking `ProductGallery` (scroll-snap, dark-green pill dots)
- Optional sample fields: `images`, `description`, `ingredients`, `rating`
- Playground demo at `/playground/product-detail` (sample switcher; weight → ruler)
- Catalog entry moved from planned → built (Product & cart)

### Files

| Path | Change |
|------|--------|
| `src/components/product/ProductDetail.tsx` | PDP composition |
| `src/components/product/ProductGallery.tsx` | Peeking image carousel |
| `src/lib/sample-products.ts` | Optional PDP fields + sample copy |
| `src/lib/playground/catalog.ts` | `product-detail` built |
| `src/components/playground/demos.tsx` | Demo + sample chips |

### Verification

- `npx eslint` on touched files — pass
- `npx next build` — pass

### Next

- Wire PDP to a real `/product/[id]` route when catalog API exists

## 2026-10-23 — Storefront PDP route

### What was built

- `/product/[id]` under storefront layout (sample catalog, `notFound` for unknown ids)
- `ProductCard` photo + name link to PDP; add / weight controls unchanged
- Shared local cart + ViewCartBar + WeightCustomizer from storefront layout

### Verification

- `npx eslint` on touched files; `npx next build`

## 2026-10-23 — Cart remove / clear + weight Edit (ecom)

### What was built

- Per-line trash + bottom **Clear basket** on shared `CartPageContent` (`/cart` + playground)
- Weight **Edit** sheet portals to `document.body`; playground cart demo mounts `WeightCustomizer`

### Verification

- Storefront `/cart` uses the same `CartPageContent`; layout already mounts `WeightCustomizer`

## 2026-10-23 — Brand green theme to storefront

### What changed

- `:root` tokens → leaf `#5CB85C`, track/forest/ink `#2A6B2A` / `#2F6B2F`, mint `#E3F5E3`
- PWA `theme_color` / viewport `themeColor` aligned
- Hardcoded offer banner/flyer greens updated

### Verification

- Visual check `/`, `/home`, `/cart`, `/playground/swipe-to-login`

## 2026-10-23 — Cart chrome + black CTA type to storefront

### What changed

- `/cart` pay bar: green (`bg-track`) + black type; soft pulse on **Together to pay** only
- Clear basket: white surface + ring for visibility
- Empty Shop now + home/profile/wishlist/login green CTAs: `text-black`
- Home top-bar Sign in: green pill + black label
- Removed playground `previewChrome` / `previewSignIn` gates

### Verification

- `npx eslint` on touched cart / home / demos / auth files
- Manual: `/cart`, `/home`, `/profile`, `/login`

## 2026-10-23 — Coupons list playground (details + copy)

### What changed

- Sample coupons + `CouponsPageContent`: sectioned cards, status pills, bottom sheet details, Copy code
- Playground entry `coupons-list` (built); `/coupons` storefront still Coming soon until promote

### Verification

- `npx eslint` on coupons + demos + sample-coupons
- Manual: `/playground/coupons-list`

## 2026-10-23 — Coupons list to storefront

### What changed

- `/coupons` uses shared `CouponsPageContent` (back to `/profile`); sample data until API

### Verification

- Manual: `/coupons` from profile Voucher / Coupons

## 2026-10-23 — Coupons empty illustration (playground)

### What changed

- `public/coupons/empty-coupons.png` + empty state in `CouponsPageContent`
- Playground `coupons-empty` with `coupons={[]}`; storefront list still sample data

### Verification

- Manual: `/playground/coupons-empty`

## 2026-10-23 — Coupons empty to storefront

### What changed

- Confirmed: `/coupons` uses shared empty illustration whenever `coupons` is empty (sample list still default until API)

### Verification

- Empty path covered by `CouponsPageContent`; list path still sample data on `/coupons`

## 2026-10-23 — Cart promo + totals playground preview

### What changed

- `previewSummary` on `CartPageContent`: promo Apply (sample codes), Subtotal / You save / Total, Clear basket above pay bar
- `applySamplePromo` helpers on sample coupons; `/cart` unchanged until promote

### Verification

- Manual: `/playground/cart-page` (add items, try `FRESH10`)

## 2026-10-23 — Cart promo + totals to storefront

### What changed

- Removed `previewSummary` gate; `/cart` has Clear, promo Apply, Subtotal/You save/Total, docked Together to pay
- Sample promo only until coupons API

### Verification

- Manual: `/cart` with items

## 2026-10-23 — Cart mt-auto pay + sticky back-only header

### What changed

- Cart totals + Together to pay in-flow with `mt-auto` (not fixed); above bottom nav via layout padding
- `PageHeader` sticky; title/center hide on scroll; back stays usable; owns safe-area
- Playground `page-header` / `cart-page` updated

### Verification

- `npx eslint` + `tsc --noEmit`
- Manual: `/cart`, `/wishlist`, `/playground/page-header`, `/playground/cart-page`

## 2026-10-24 — Wishlist guest-gate on storefront

### What changed

- `WishlistProvider` (guest) on storefront layout — ProductCard / PDP hearts → `/login`
- `/wishlist` stays empty-only until wishlist API; playground `wishlist-list` keeps signed-in grid

### Verification

- `npx tsc --noEmit`
- Manual: `/home` heart → `/login`; `/wishlist` empty; `/playground/wishlist-list` grid

## 2026-10-24 — Promote wishlist grid to storefront

### What changed

- Storefront `WishlistProvider previewSignedIn` — hearts save to `localStorage`
- `/wishlist` uses `WishlistPageContent` (empty or product grid)
- Playground guest-heart demo still uses guest layout provider

### Verification

- Manual: heart on `/home` or PDP → item on `/wishlist`; heart again removes

## 2026-10-24 — Checkout playground (COD + confirmed mascot)

### What changed

- `public/checkout/order-confirmed-mascot.png` (w-52 display, cutout)
- `CheckoutPageContent`: address (Edit sheet), COD only, amount due from cart, Place Order → confirmed + mascot
- Playground slug `checkout` built; no `/checkout` route yet; does not submit a real order

### Verification

- Manual: `/playground/checkout` — add address, Place Order → mascot; empty cart shows error

## 2026-10-24 — Shared promo + promote checkout to ecom

### What changed

- Promo code lifted into `CartContext` (localStorage); cart + checkout share coupon line / totalDue
- `/checkout` route; cart Checkout → `/checkout` (playground → `/playground/checkout`)
- Bottom nav hidden on `/checkout`

### Verification

- Manual: apply FRESH10 on `/cart` → see Coupon on `/checkout` Amount due; Place Order → tick → mascot

## 2026-10-24 — Order history list + detail

### What changed

- `sample-orders.ts` — 3 sample orders (out for delivery, delivered, cancelled)
- `/orders` list cards; `/orders/[id]` timeline, address, items, price details
- Playground: `orders-list`, `order-detail`, `empty-orders`

### Verification

- Manual: `/orders` → tap YAD-1042 → timeline + coupon line; empty demo in playground

## 2026-10-24 — Promote orders UI + sample API façades

### What changed

- Removed `previewOrderStyle` / legacy order detail; ecom + playground use grocery list cards + vertical ORDER STATUS only
- Added `src/lib/api/orders.ts`, `coupons.ts`, `wishlist.ts` — pages call façades instead of sample arrays directly
- Wired `/orders`, `/orders/[id]`, `CouponsPageContent`, wishlist comments/storage key

### Verification

- `npx tsc --noEmit`
- Manual: `/orders` → detail; `/coupons`; `/wishlist`

## 2026-10-24 — Storefront page + navbar view transitions

### What changed

- `(storefront)/template.tsx` — React `ViewTransition` page fade / forward / back
- Bottom nav pinned during VT; active pill morph + label width ease; `nav-tab` types
- Back → `nav-back`; product / order detail / cart bar → `nav-forward`
- Light `(storefront)/loading.tsx`; VT CSS + reduced-motion in `globals.css`

### Verification

- `npx tsc --noEmit`
- Manual: tab between Home / Wishlist / Profile; open a product; back
