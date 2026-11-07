# Implementation Log

## 2026-11-07 — Shop-scoped profile member title

### What changed

Signed-in `ProfileHero` falls back to `{shopName} Member` (from `ShopNameProvider` / `getShopSeo`), not “Yaadro Member”. `/profile` wraps with the live shop name. Playground shows Green Basket and City Mart examples.

### Files

| Path | Change |
|------|--------|
| `src/components/profile/ProfileHero.tsx` | Default title from `useShopName()` |
| `src/app/(storefront)/profile/page.tsx` | `ShopNameProvider` + `getShopSeo` |
| `src/components/playground/demos.tsx` | Two shop-scoped signed-in previews |
| `src/lib/playground/usage.ts` / `catalog.ts` | Docs |

## 2026-11-07 — Wire ProfileHero signed-in preview to /profile

### What changed

`/profile` uses `ProfileHero` with a local signed-in preview (seeded default avatar), matching the wishlist scaffold until a session API exists. Home still shows Sign in; the tick stays playground-only. Playground profile header still shows guest and signed-in.

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/profile/page.tsx` | Use `ProfileHero` signed-in preview |
| `src/components/profile/ProfileHero.tsx` | Storefront-friendly signed-in subtitle |
| `src/lib/playground/catalog.ts` | Note wires to `/profile` |

## 2026-11-07 — Default profile avatars (playground signed-in)

### What changed

Sixteen default avatars live under `public/avatars/`. `pickDefaultProfileAvatar(userId)` picks one stably from the seed. The playground profile header shows guest vs signed-in with that avatar. Home top bar still uses only the tick icon. `/profile` now uses the signed-in preview (see entry above).

### Files

| Path | Change |
|------|--------|
| `public/avatars/avatar-01.svg` … `avatar-16.svg` | Default avatar set |
| `src/lib/default-profile-avatar.ts` | Seeded random pick |
| `src/components/profile/ProfileHero.tsx` | Guest / signed-in hero |
| `src/components/playground/demos.tsx` | Profile header preview |
| `src/lib/playground/catalog.ts` | Describe the preview |

## 2026-11-07 — Signed-in HomeTopBar preview in the playground

### What changed

`HomeTopBar` accepts `signedIn`. Guest keeps the Sign in pill. Signed in shows the profile-tick icon with no round background, linking to `/profile`. The playground home-top-bar demo shows both. `/home` stays guest until auth exists.

### Files

| Path | Change |
|------|--------|
| `public/icons/profile-signed-in.svg` | Transparent profile-tick icon |
| `src/components/home/HomeTopBar.tsx` | Optional `signedIn` prop |
| `src/components/playground/demos.tsx` | Guest + signed-in bars |
| `src/lib/playground/catalog.ts` | Describe the preview |

## 2026-11-07 — Hide bottom nav on focused storefront screens

### What changed

Bottom nav stays on Home, Categories, Wishlist, Profile, Orders, Coupons, category PLP, and product detail. It is removed on cart, checkout, order detail, and profile edit / addresses / settings / support. The playground BottomNav demo lists those paths.

### Files

| Path | Change |
|------|--------|
| `src/lib/storefront-nav.ts` | Shared hide-path helper |
| `src/components/storefront/StorefrontChrome.tsx` | Use the helper |
| `src/components/playground/demos.tsx` | BottomNav demo + related notes |
| `src/lib/playground/catalog.ts` | Describe where the nav hides |

## 2026-11-07 — Fix comma-joined catalog image URLs

### What changed

Product (and category) image fields that dump several absolute URLs in one comma-joined string now keep each URL separate and use the first for the card. Google Shopping thumbs on gstatic load with a plain `img` so `/_next/image` is not asked to fetch URLs that return 404.

### Files

| Path | Change |
|------|--------|
| `src/lib/catalog-map.ts` | Split comma-joined image strings |
| `src/lib/api/storefront.ts` | Same split for category images |
| `src/components/ui/CatalogImage.tsx` | Skip next/image for gstatic |

## 2026-11-06 — Shop category grid leads with a wide tile

### What changed

The live “Shop by category” grid uses the same first-tile rectangle as the playground Fresh section. The first category spans two columns. The rest stay squares.

### Files

| Path | Change |
|------|--------|
| `src/components/categories/CategoriesHub.tsx` | Shop section layout is `rect-first` |
| `src/components/playground/demos.tsx` | Note matches the shop grid |
| `src/lib/playground/catalog.ts` | Describe the shared rectangle |

## 2026-11-06 — Home product shelf uses one row until 11 products

### What changed

The home category shelf keeps 10 or fewer products in one horizontal row. More than 10 split evenly into two scrolling rows. The playground product section shows both: Vegetables (10) and a 12-product shelf.

### Files

| Path | Change |
|------|--------|
| `src/components/home/ProductSection.tsx` | Row count follows the product count |
| `src/components/playground/demos.tsx` | Show the one-row and two-row shelves |
| `src/lib/playground/catalog.ts` | Describe the row rule |

## 2026-11-06 — Copy puts the bill image on the clipboard

### What changed

Copy on the ticket bill writes the same PNG that Download saves, instead of the plain-text receipt. Playground and `/orders` share that bill.

### Files

| Path | Change |
|------|--------|
| `src/components/orders/lead-order-shared.tsx` | Clipboard item is `image/png` from the ticket canvas |

## 2026-11-06 — Category placeholder on the shop

### What changed

A shop category with no photo now uses the white grocery-bag image on the home rail, the categories hub, and the category listing rail. The image stays `object-contain` on white. Categories that already have a photo still fill their frame.

### Files

| Path | Change |
|------|--------|
| `src/lib/api/storefront.ts` | Map a missing category image to the bag |
| `src/app/(storefront)/categories/page.tsx` | Same fallback on the hub |
| `src/components/home/CategoryRail.tsx` | Default fallback is the bag |
| `src/components/categories/CategoriesHub.tsx` | Default fallback is the bag |
| `src/components/categories/CategoryListing.tsx` | Listing rail uses the bag |

## 2026-11-06 — Ticket download matches the on-screen bill

### What changed

Download on the playground orders list saves the ticket at the card’s own width (352px, written at 2×). The total rule sits above TOTAL and the amount. The file name stays `{shop name}-{bill number}.png`. The same bill component is used on `/orders`.

### Files

| Path | Change |
|------|--------|
| `src/components/orders/lead-order-shared.tsx` | Draw the PNG from the ticket layout instead of a 760px canvas |

## 2026-11-06 — Category placeholder sits on white without cropping

### What changed

The playground category bag now has a white background and is scaled to fit inside the circle and hub tile. Fallback images use `object-contain` on a white frame, so the bag keeps its shape. Real category photos still use `object-cover`.

### Files

| Path | Change |
|------|--------|
| `public/categories/no-image.png` | White-background bag, full artwork visible |
| `src/lib/category-image.ts` | Point the playground fallback at the png |
| `src/components/home/CategoryRail.tsx` | Contain the placeholder |
| `src/components/categories/CategoriesHub.tsx` | White tile and contain the placeholder |

## 2026-11-06 — Category placeholder preview in the playground

### What changed

A category with no photo can use `public/categories/no-image.jpg` (the bag on a black background). The playground category rail and categories hub pass that file and include one empty-image category so it is visible. Storefront category tiles still fall back to `/icons/icon-192.png` until this look is approved for the shop.

### Files

| Path | Change |
|------|--------|
| `public/categories/no-image.jpg` | Black-background bag |
| `src/lib/category-image.ts` | Playground and storefront fallback paths |
| `src/components/home/CategoryRail.tsx` | Optional `imageFallback` |
| `src/components/categories/CategoriesHub.tsx` | Optional fallback and a playground-only empty tile |
| `src/components/playground/demos.tsx` | Show the placeholder on the rail and hub |

## 2026-11-06 — Grocery-bag placeholder for products with no photo

### What changed

A product with no image uses `public/products/no-image.jpg` on the product card and the detail gallery, instead of the app icon. The catalog mapper applies the same file. The playground ProductCard and product-detail demos include a “No photo yet” row so the placeholder can be reviewed.

### Files

| Path | Change |
|------|--------|
| `public/products/no-image.jpg` | Bag illustration |
| `src/lib/product-image.ts` | Shared fallback path |
| `src/components/product/ProductCard.tsx` | Use the fallback |
| `src/components/product/ProductGallery.tsx` | Use the fallback |
| `src/components/playground/demos.tsx` | No-photo card and detail chip |

## 2026-11-06 — Cart suggestions use the live catalog

### What changed

`/cart` “You may also like” no longer reads `SAMPLE_PRODUCTS`. It loads the shop catalog for the basket’s categories, then fills any remaining slots with other shop products, and skips items already in the cart. The playground cart still uses the sample rail when its demo products have no category id.

### Files

| Path | Change |
|------|--------|
| `src/lib/api/suggest-cart-products.ts` | Server function for live suggestions |
| `src/components/cart/CartSuggestions.tsx` | Load live products on the storefront |
| `src/components/cart/CartPageContent.tsx` | Pass category ids from cart snapshots |
| `src/components/product/ProductDetail.tsx` | Remember the product when it is added, so the cart has its category |

## 2026-11-06 — Unblock static routes whose metadata reads the shop host

### What changed

Root `generateMetadata()` calls `getShopSeo()`, which reads `headers()` so the title can follow the shop domain. With Cache Components, an otherwise static page such as `/cart` then fails prerender with “runtime data in `generateMetadata()`”. A null `connection()` marker in the root layout, inside `<Suspense>`, tells Next.js that this request-time metadata is intentional. Page HTML still prerenders; the shop title streams with the request.

### Files

| Path | Change |
|------|--------|
| `src/components/seo/ShopMetadataMarker.tsx` | Suspended `connection()` marker |
| `src/app/layout.tsx` | Render the marker under `<Suspense>` |

## 2026-11-06 — Public catalog API on home, categories, and PDP

### What was built

- Storefront client for shop resolve, SEO, categories, products, and home sections (`src/lib/api/storefront.ts`)
- Prices converted from minor units onto the existing product card shape
- `/home`, `/categories`, `/categories/[slug]`, and `/product/[id]` use the live shop (`NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SHOP_ID`)
- Cart and wishlist keep a display snapshot so a live product is not replaced by a sample row
- Playground demos still use sample data when no live props are passed

### Verification

- Live API: categories, products, home sections, and shop SEO return 200 for the configured shop
- Dev server: `/home` shows GreenLeaf Mumbai, shop categories, Soya chunks ₹49, Festive shelf; `/categories/fruits` lists green apple ₹250; `/product/green-apple` shows that product and related items
- `npx tsc --noEmit` — no new errors in these files (pre-existing order playground type errors remain)

## 2026-10-26 — Categories hub + PLP wired to storefront

### What was built

- `/categories` hub (search, Fresh rect-first / Drinks square-then-rect grids)
- `/categories/[slug]` PLP (filters, left subcategory rail, 2-col ProductCard grid)
- Home search gateway → `/categories?focus=search`
- Playground demos remain (`categories-hub`, `category-plp`, `home-search-categories`)

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/categories/page.tsx` | Hub page |
| `src/app/(storefront)/categories/[slug]/page.tsx` | PLP route |
| `src/components/categories/*` | Hub, listing, page content |
| `src/lib/catalog-taxonomy.ts` | Sample sections / slugs |
| `src/app/(storefront)/home/page.tsx` | `activateHref` on search |
| `docs/PROJECT_STATUS.md` | Routes |

### Verification

- `npx tsc --noEmit` — pass

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
