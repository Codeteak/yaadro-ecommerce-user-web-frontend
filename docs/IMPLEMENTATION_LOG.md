# Implementation Log

<<<<<<< HEAD
## 2026-11-20 — Gap bugs #3: address sheet sync, DB search, Next 16.4.5

Address book refreshes `GET /api/storefront/address` every open and upserts the local row. `/categories?q=` passes search into `listStoreProducts` (DB name/slug match, up to 3 pages). Upgraded `next` + `eslint-config-next` to **16.4.5** (Nov 2026 security patch). COD place-order still needs a signed-in manual click-through.
=======
## 2026-11-20 — Categories sticky rail (single scrollport)

`/categories` uses one overflow scroller: header + search scroll away, `CategoryRail` is `sticky top-0`, scrolling back restores header/search. Page height `calc(100dvh - nav)` + `data-storefront-fill`. Same on horizontal `CategoryListing`. (Nested product-only pane was too short and felt broken.)
>>>>>>> 5d6c5a0 (fix: sticky category rail scroll, PWA install scope, wishlist hydration, ribbon fringe)

## 2026-11-20 — Parity blockers: cookies, search, address, cart shop, session, PWA

Storefront fetch sends `credentials: include` on `/api/storefront/*`. Home search → `/categories?q=` filters. One delivery address syncs from server on login and saves via address API. Cart/wishlist keys are per shop (no migrate). Refresh token in localStorage (~50 days). Domain resolve caches shop id/banners; empty banners hide. Nominatim reverse fallback. `/new` and `/trending` → `/home`. PWA: `public/sw.js` + install prompt; favicon/manifest prefer shop image.

## 2026-11-20 — Categories product grid scroll stuck

`StorefrontPageFrame` `height="fill"` body is a flex column with `overflow-hidden` so the product pane gets a bounded height and scrolls. Product sections use `touch-pan-y`. PTR touchstart is scoped to its own root.

## 2026-11-20 — Elastic multi-page PTR reverted

Dropped playground `PhasePullRefreshPagesDemo` / `EditProfilePull`. Kept original `PullToRefresh` (home, profile, wishlist, coupons, edit). No multi-page elastic wire.

## 2026-11-20 — Product card ribbon white fringe

`ProductCard` Ribbon: removed SVG drop-shadow (side halo), same-color stroke to seal AA edges, shape bleeds under card `overflow-hidden`. Photo `#f4f6f8`. Shared → live + playground.

## 2026-11-20 — PWA install prompt: `/home` only + session dismiss

`InstallPrompt` opens only on ecom `/home` (not login/playground/other routes). Dismiss uses `sessionStorage` so it can show again after the browser session ends. Playground `/playground/pwa-install-prompt` uses `forcePreview`.

## 2026-11-20 — Wishlist heart hydration mismatch

`useWishlistToggle` aria-label no longer branches on signed-in (“Sign in to save…” vs “Add…”) so SSR guest HTML matches client hydrate after session restore under home Suspense. Guest tap still toasts and routes to `/login`.

## 2026-11-19 — Address search polish (suggestions + post-select)

No Search button. Pill search field (border, clear X). Places suggestions list refined (pin chip + dividers). After pick: dropdown closes and stays closed until the field is edited; short primary label in the input. Removed “Location updated from search” notice.

## 2026-11-19 — Address search + Detect UI refine

Shared `AddressSearchField` + `AddressDetectButton` (GPS card with helper text). Removed floating map locate FAB and locate-inside-search. Map step + Location details use the same controls. Live + playground via `AddressBookSheet`.

## 2026-11-19 — Order bill coupon discount (TEST −₹1000 not −₹3550)

`mapCustomerOrder`: when `coupon_code` is set, use `coupon_discount_minor` (do not `Math.max` with inflated `promotion_discount_total_minor`). Cap discount at item total. `billedTotal` also caps promo. Playground `/playground/order-bill-coupon` shows wrong-vs-fixed. Regression test in `customer-orders-map.test.ts`.

## 2026-11-19 — Profile refresh: no Guest/Customer flash

`useCustomerAuthStatus` distinguishes loading vs guest vs signed-in. Profile hero/nav wait on restore (skeleton or cached name+avatar seed in sessionStorage) instead of showing Guest then “Customer”. Logout clears the cache. Edit profile waits on auth ready. Pull-to-refresh on `/profile` invalidates `["profile"]`. Skeletons: `ProfileHeroSkeleton` / `ProfileNavSkeleton` / `ProfilePageSkeleton` (white wash on mint hero; Suspense fallback no longer blank).

## 2026-11-19 — Phase D wired (#33); #27 marked done

Live `/cart` Checkout opens `PriceMayVaryExplainSheet` (notice stays display-only). Continue → `/checkout`. Help → `/profile/support?topic=price` with `nav-return-stack` Back. Playground `/playground/price-vary-explain` remains the flow reference. #15 / #25 skipped.

## 2026-11-19 — Phase D playground (#33); #27 marked done

`/playground/price-vary-explain` — cart **Checkout** opens explain popup; **Continue to checkout** then shows checkout. Notice display-only (no `?`). Help FAQ + return stack.

## 2026-11-19 — Phase C wired (#31, #35)

Profile Address opens manage sheet (no dedicated page); `/profile/addresses` redirects to `/profile?address=1`. Checkout + home Deliver to open `AddressBookSheet` with `editId` on Edit. Playground `/playground/address-modal-shared` remains the reference. #27 skipped.

## 2026-11-19 — Phase C playground (#31, #35)

`/playground/address-modal-shared` — shared `AddressBookSheet` for profile add/edit (no dedicated page) and checkout Edit with `editId`. Live `/checkout` still opens the sheet without `editId`; `/profile/addresses` page still exists until wire. #27 coupon design skipped.

## 2026-11-19 — Phase B wired (#28, #29, #30)

`CategoryCard` on live CategoryRail, CategoriesHub, CategoryBrowser, CategoryListing (#28). `StorefrontPageFrame` on live `/categories`, `/wishlist`, `/orders` (#29). Home aisle browse via `browseSectionsFromBranches` on live `/home` (#30). Playground demos remain as references.

## 2026-11-19 — Phase B playground (#28, #29, #30)

`CategoryCard` shared API + `/playground/category-card-shared` (#28). `/playground/storefront-shell` fixed PageHeader + BottomNav (#29). `/playground/home-more-sections` richer home stack (#30). Live `/home` and hub unchanged until wire.

## 2026-11-19 — Phase A wired (#1, #32, #34, #36)

Live `/cart` uses `solidCheckoutCta` (#32). Cart-store qty/weight keep insertion order (#36). Live `/checkout` already had Amount due off (#34). BottomNav pill/scroll motion counted as #1. `fix.md` updated accordingly.

## 2026-11-19 — Delivery partner from API only

Order detail no longer invents “Ravi Kumar”. `mapDeliveryPartner` reads shop/DMS fields (`delivery_partner`, `rider`, `*_name` / `*_phone`) when present; otherwise the UI shows “Delivery partner”. Call uses `tel:` only when a phone is returned. Live track already skipped invented riders. Ecommerce orders today still often omit partner (DMS #25).

## 2026-11-19 — Order bill totals match cart math

Shop `subtotal_minor` is net of promo; the old mapper treated it as pre-promo and also rewrote `totalDue` whenever `total >= subtotal` (true with any delivery fee), which double-subtracted the coupon on bills. Mapping now stores item total before promo; `billedTotal` = item − promo + delivery. Checkout bill uses Item total (not MRP); order placed / detail / ticket / receipt share the same rows.

## 2026-11-19 — Location toasts (#26 wired)

Canonical copy in `src/lib/location-messages.ts`. Live checkout toasts need-address / allow-location / outside-area / check-failed (still keeps helper text under Place Order). Address book toasts detect fail, pick/type area, confirm pin, location found, address saved. Playground `/playground/toasts` Location group mirrors the same strings. `deliveryAreaBlock` delegates to `deliveryAreaMessage`.

## 2026-11-19 — Logout confirm on ecom + latency cuts

Live `/profile` Log out uses confirm sheet (red confirm). Home/categories `all` load one product page (not three). `getShopSeo` request-deduped via React `cache()`. Cart preview debounced; Checkout reuses quote when present (no second POST).

## 2026-11-19 — Fix wishlist session hydration mismatch

`useCustomerSignedIn` keeps signed-in false through SSR/hydration, then waits for `ensureCustomerSessionRestored()` (access token) before treating the shopper as signed in — avoids bare `GET /api/me/profile` 401 when only a refresh token exists. Fixes ProductCard heart hydration. Wired through `CustomerSession`, home account chip, cart/checkout/coupons/profile/orders.

## 2026-11-19 — Logout confirm (playground first)

`LogoutButton` supports `confirmBeforeLogout` + playground `dryRun`. `/playground/profile-header` signed-in nav shows Cancel / Log out sheet (toast only). Live `/profile` still logs out immediately until wired.

## 2026-11-19 — Edit profile avatar matches hero

`/profile/edit` uses the same `pickDefaultProfileAvatar(userId)` as `ProfileHero`. The decorative Plus “add photo” control is removed (upload not offered yet).

## 2026-11-19 — Shop-authored coupons (live) + playground fixture

Live `/cart` + `/checkout` + `/coupons?from=cart`: Top offers from `GET /api/storefront/coupons` only (hidden when empty); Apply confirms via `POST /api/storefront/cart/preview`; Coupon −₹ from preview `coupon_discount_minor`. Playground keeps SAMPLE top offers / local apply; `/playground/checkout-coupon` shows a totals fixture with Coupon −₹ for testers.

## 2026-11-19 — Profile hero shows user name

Signed-in `ProfileHero` loads `displayName` / `user.name` from `GET /api/me/profile` (shared `["profile"]` query). No more `{shopName} Member`. Playground demos pass sample names (`Priya Nair`, `Arun`).

## 2026-11-19 — Address sheet Google Map

Address select uses `@react-google-maps/api` with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API). Tap / drag pin reverse-geocodes; search forward-geocodes; details mini-map uses Maps Embed place when lat/lng exist. Shared helpers: `reverseGeocodeLatLng`, `geocodeSearchQuery`, `buildPlaceEmbedUrl`.


## 2026-11-19 — Home load streaming (#3) + deferred location (#7)

`/home` streams in three Suspense bands: hero (shop SEO), category rail (`listStoreCategories` only), then product shelves (`loadHomeCatalog`). `#7` mounts `DeferredLocationPrompt` on `/home` (opens address sheet after paint when Deliver to is empty). Playground deferred-location + home-pull notes updated.

## 2026-11-19 — Help & Support wired (#15)

`/profile/support` mounts `HelpSupportContent` with live shop name via `getShopSupportContact()` → `getShopSeo()`. Call / WhatsApp / Location only render when `NEXT_PUBLIC_SHOP_SUPPORT_PHONE` / `_ADDRESS` / `_MAPS_URL` are set (API has no shop contact fields yet). FAQ covers orders, coupons, address, COD, price variance. Playground keeps `SAMPLE_SHOP_SUPPORT`.

## 2026-11-19 — Order detail address + line images

`customer-orders` maps `customer_address` via `line1`/`raw`/common aliases (and JSON strings). Blank Address row hidden. Bill lines always show a thumb from API image fields, product snapshot, sample catalog, or `PRODUCT_IMAGE_FALLBACK`. Promo-aware payable total when API `total_minor` ignores discount.

## 2026-11-19 — Orders list order id + parcel (wired)

Live `/orders` + playground: `showOrderId` — parcel SVG + `order.number`. Track order uses black `delivery-scooter.svg`.

## 2026-11-19 — Phase A (#16, #19, #21) wired to ecom

Live `/cart`: `weightAtBottom` + `syncCheckoutTotal`. Live `/orders`: `highlightStatus`. Playground demos match.

## 2026-11-18 — Shop minimum, automatic offers, and events

The cart and checkout keep a shop quote open. A minimum that is not met stays on the page and turns Checkout off. Automatic offers, reached and not yet reached, sit under the bill, and a category offer opens that aisle. A shop total of ₹0 is shown as ₹0. A home shelf title opens `/events?id=` for that section, with its dates and products. A minimum change from the shop refreshes the open quote.

## 2026-11-17 — Status card uses the storefront type

The status card now uses Plus Jakarta Sans, the forest title, the 15px and 13px sizes, and the same white card, green shadow, and leaf, mint, and red used on the other screens.

## 2026-11-17 — Cart checks the shop rules before checkout

Checkout stays on the cart until the shop preview says the basket passes. A short warning covers the minimum order, a coupon the shop rejected, a missing product, or a line over 10. The next page opens only after that check succeeds. If placing the order later fails for one of those basket rules, the same warning sends the shopper back to the cart.

## 2026-11-17 — Status card sits at the top

The status card now pins to the top of the window on every page. It still blurs the screen and dismisses itself.

## 2026-11-17 — Minimum order returns to step 1

If the shop rejects an order because the basket is under its minimum, checkout no longer prints that note and a reference id under Place Order. A warning card says this is step 1, the cart, and the shopper is taken back to the cart page. The cart header reads “Step 1 · Your cart”.

## 2026-11-17 — One status popup

Success, error, info, and warning results now use one centered card. Pages call `showPopup(message, type)`. The card is the only thing that re-renders, and the screen blurs lightly while it is open. Field errors stay next to the input.

## 2026-11-17 — One delivery address

Profile address no longer offers a second address, a default star, or the sample Home and Office rows. Saving replaces the single address used by home and checkout.

## 2026-11-17 — Delivered orders hide the partner number

A delivered order no longer shows the delivery partner call button on the order detail opened from order history. Orders that are still on the way keep it.

## 2026-11-17 — Profile menu without Settings

The profile menu no longer lists Setting. The `/profile/settings` stub page is removed. My Profile, Address Management, and Help & Support stay.

## 2026-11-17 — Signed-in home header

A successful OTP login shows "You're signed in." in the top toast, then follows the existing return path (`/home` when none was asked). The home header profile icon reads the current session in its own link, so the rest of the bar does not re-render.

## 2026-11-17 — Product card size

The default product card now uses a square photo, 20px corners, a 32px two-line name, a 14px unit line, and a 44px add control. Compact rail cards are unchanged. The page grid is unchanged.

## 2026-11-16 — Catalog reads from Postgres

Home, category, and product pages read categories, products, and home shelves from `DATABASE_URL` on the Next.js server. The statements are parameterized copies of the shop API filters: this shop, active, in stock, and sellable categories only. Checkout shows a radius preview from the same database when an address already has a pin. Place Order still calls `POST /api/storefront/location/check` so the shop signs the delivery cookie. Campaign price overlays stay on the shop API.

## 2026-11-16 — Delivery-area check before checkout

Place Order calls `POST /api/storefront/location/check` with the address pin. If the address has no pin, the browser is asked up to three times for the device location. A random pin is never invented. The order is sent only when the shop says the location is serviceable. `npm test` runs from the Husky pre-commit hook.

## 2026-11-16 — Customer API client

Connected the storefront to `ecommerce_clientside_backend` branch `alan-new`. One fetch client normalizes errors, refreshes a 401 once, and retries only safe GETs. Login, profile, address, coupons, orders, and checkout call the shop. The basket stays on the device because server cart writes return 410. Wishlist has no endpoint.

## 2026-11-16 — Wire comfortable coupon tickets to ecom

### What changed

Default ticket body is **comfortable** (discount → title → code/until; no stub dashed box). Wired on `/coupons` and playground. Legacy `compact` still available via prop.

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/coupons/page.tsx` | Comfortable density |
| `src/components/coupons/CouponTicketCard.tsx` | Default comfortable |
| `src/components/coupons/CouponsPageContent.tsx` | Default comfortable |
| Playground catalog / demos / usage | Match ecom |

## 2026-11-16 — Coupon ticket comfortable density (playground only)

### What changed

Ticket silhouette unchanged. Added `density: compact | comfortable` on `CouponTicketCard`. Playground preview first; later wired to ecom (see entry above).

### Files

| Path | Change |
|------|--------|
| `src/components/coupons/CouponTicketCard.tsx` | Density layouts |
| `src/components/coupons/CouponsPageContent.tsx` | `ticketDensity` prop |

## 2026-11-16 — Track page Download Bill = order-details ticket

### What changed

Live track **Download Bill** opens the same `OrderTicketBill` as order details / history. Resolves order from prop, tracking number, or sample fallback (`ord-1042` / `ord-1038`). Playground live-order-track demo updated (default OFD, bill note, catalog/usage).

### Files

| Path | Change |
|------|--------|
| `src/components/orders/LiveOrderTrack.tsx` | `resolveBillOrder` + ticket dialog |
| `src/lib/api/orders.ts` | `getOrderByNumber` |
| Playground catalog / demos / usage | Track + bill notes |

## 2026-11-16 — Separate ecom tracking route (not order details)

### What changed

Live tracking stays its own page. Classic `/orders/[id]` unchanged. New shareable `/orders/[id]/track` maps sample orders → `LiveOrderTrack`. Order detail **Track order** and checkout confirmation **Track order** link there. Playground `/playground/live-order-track` remains the phase demo.

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/orders/[id]/track/page.tsx` | Ecom tracking route |
| `src/components/orders/OrderLiveTrackPage.tsx` | Order → live-track sample |
| `src/components/orders/LiveOrderTrack.tsx` | Accepts `sample` + `backHref` |
| `src/lib/order-live-track.ts` | Mapper (already present; used) |
| `src/components/orders/OrderDetailPlayground.tsx` | Track → `/orders/[id]/track` |
| `src/components/checkout/OrderPlacedContent.tsx` | Track CTA separate from details |
| `src/lib/storefront-nav.ts` | Hide bottom nav on track |

## 2026-11-16 — Live track: Packed phase + mascot cut fix

### What changed

Added Packed between Accepted and Out for delivery. Grocery-bag mascot → `packed.png`; new scooter mascot → `out-for-delivery.png`. Re-keyed all four phase PNGs with a strict black flood (hard ≤3) so dark pants stay opaque; soft fringe only on silhouette. Playground chips: Accepted / Packed / Out for Delivery / Delivered.

### Files

| Path | Change |
|------|--------|
| `public/orders/live-track/{packed,out-for-delivery,order-accepted,delivered}.png` | Transparent mattes, pants preserved |
| `src/lib/live-order-track.ts` | `phase: "packed"` + sample |
| `src/components/orders/LiveOrderTrack.tsx` | Packed chip + shared `StatusMascotArt` |
| Playground usage / demos | Packed asset + note |

## 2026-11-16 — Order placed confirmation (mascot + bill card)

### What changed

Checkout confirmed phase and new playground `/playground/order-placed`: keep `order-confirmed-mascot.png`, add bill summary (Confirmed / Delivery), View Order + Back to home.

### Files

| Path | Change |
|------|--------|
| `src/components/checkout/OrderPlacedContent.tsx` | Shared confirmation UI |
| `src/components/checkout/CheckoutPageContent.tsx` | Confirmed phase uses it |
| Playground catalog / demos / usage | `order-placed` entry |

## 2026-11-16 — Live order track: inline progress + Maps Embed

### What changed

Order Progress is inline on the same page (no sheet). Live Track map uses Google Maps Embed when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise shows “Map API not configured”.

### Files

| Path | Change |
|------|--------|
| `src/components/orders/LiveOrderTrack.tsx` | Inline progress; Embed map panel |
| `src/lib/live-track-map.ts` | Embed URL helper |
| `src/lib/live-order-track.ts` | Map lat/lng on sample |
| `.env.example` | Note Embed + Geocoding |

## 2026-11-16 — Live order track playground (green theme)

### What changed

New playground demo `/playground/live-order-track`: screenshot-inspired live tracking (Accepted / Out for Delivery), Yaadro green + INR. Not wired to `/orders`.

## 2026-11-16 — Fix toast visibility (portal + root provider)

### What changed

Some toasts were hidden under sheets (`z-70`/`z-80`) or cleared when navigating to `/login` (outside storefront layout). Viewport now portals to `document.body` at `z-[110]`. Single `ToastProvider` on the root layout.

## 2026-11-16 — Wire island toasts to storefront

### What changed

Mounted `ToastProvider` on the storefront layout. Hooked planned copy into cart promo/clear, wishlist hearts, coupons apply/copy, address save/update/delete/default, order copy/download, and checkout place-order stub. Playground notes updated.

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/layout.tsx` | ToastProvider |
| `src/components/ui/ToastContext.tsx` | Bottom offset for nav |
| `src/components/cart/CartPageContent.tsx` | Promo / clear toasts |
| `src/components/product/ProductCard.tsx` | Wishlist toasts |
| `src/components/product/ProductDetail.tsx` | Wishlist toasts |
| `src/components/coupons/CouponsPageContent.tsx` | Apply / copy toasts |
| `src/components/delivery/*` | Address toasts |
| `src/components/checkout/CheckoutPageContent.tsx` | Place-order toasts |
| `src/components/orders/*` | Copy / download toasts |

## 2026-11-12 — Wire category filters to storefront home

### What changed

`/categories` already uses `CategoryBrowser` (collapsible chips). Home search filter now goes to `/categories?focus=search&chips=1` so the chip row opens on arrival. `initialChipsOpen` reads `chips=1`.

### Files

| Path | Change |
|------|--------|
| `src/app/(storefront)/home/page.tsx` | `filterHref` with chips=1 |
| `src/components/home/HomeSearchBar.tsx` | `filterHref` nav |
| `src/components/categories/CategoriesPageContent.tsx` | Pass `initialChipsOpen` |
| `src/components/categories/CategoryBrowser.tsx` | `initialChipsOpen` prop |

## 2026-11-12 — Shared Filter/Brands/Type/Sort chips on categories

### What changed

Extracted `PlpFilterChips` (same pill row as Fruits PLP). `/categories` shows it under search; PLP reuses it. Filter sheet is toggles-only again; Brands/Type/Sort open their own sheets. Playground notes updated.

### Files

| Path | Change |
|------|--------|
| `src/components/categories/PlpFilterChips.tsx` | Shared chip row |
| `src/components/categories/CategoryBrowser.tsx` | Chips under search |
| `src/components/categories/CategoryListing.tsx` | Uses shared chips |
| `src/components/categories/PlpFilterSheets.tsx` | FilterBody toggles only |

## 2026-11-12 — Categories search filter chip opens PLP sheets

### What changed

`/categories` search filter button opens the same `PlpFilterSheets` as Fruits/Veggies PLP. Active filters show a red badge on the chip and filter the product grid. Playground `category-browser` note updated.

### Files

| Path | Change |
|------|--------|
| `src/components/categories/CategoryBrowser.tsx` | Filter state + sheets |
| `src/components/home/HomeSearchBar.tsx` | `filterActive` badge |
| Playground catalog / demos / usage | Notes |

## 2026-11-12 — PLP sidebar matches category browser

### What changed

`/categories/[slug]` (Fruits/Veggies Browse all) left rail now uses `CategoryTile size="sidebar"` like `/categories` — square tiles, mint active, no green side bar / circles. Skeleton + playground PLP notes updated.

### Files

| Path | Change |
|------|--------|
| `src/components/categories/CategoryListing.tsx` | Sidebar tiles + gutters |
| `src/components/ui/skeletons.tsx` | Square sidebar placeholders |
| Playground demos / catalog / usage | PLP notes |

## 2026-11-10 — Denser home product cards

### What changed

Home rail slot narrowed to ~152px. Default ProductCard photo is `3:2` with smaller title/price so home (and shared grids) read shorter. Playground product-card / product-section notes updated.

### Files

| Path | Change |
|------|--------|
| `src/lib/product-card-layout.ts` | `PRODUCT_CAROUSEL_SLOT` → `9.5rem` |
| `src/components/product/ProductCard.tsx` | `aspect-[3/2]`, `text-base` price |
| `src/lib/type-scale.ts` / `skeletons.tsx` | Denser title |
| Playground demos / catalog / usage | Notes |

## 2026-11-10 — Hide bottom nav on nested category scroll

### What changed

`useScrollDirection` listens in the capture phase so nested `/categories` overflow panels hide the bottom nav on scroll-down. Playground `bottom-nav` and `category-browser` demos show the same behavior with inline BottomNav.

### Files

| Path | Change |
|------|--------|
| `src/components/navigation/useScrollDirection.ts` | Capture nested scroll |
| `src/components/navigation/BottomNav.tsx` | Hide on scroll in inline demos too |
| `src/components/categories/CategoryBrowser.tsx` | `data-storefront-scroll` markers |
| `src/components/playground/demos.tsx` (+ catalog/usage) | Scroll-hide demos |

## 2026-11-10 — Polish CategoryBrowser (keep vertical-tile layout)

### What changed

Kept the developer’s `/categories` browser layout. Sidebar tiles use `CategoryTile size="sidebar"` (smaller, mint active + leaf bar). Full-height rail divider, aligned search/product gutters. Playground entry `category-browser` mirrors `/categories`.

### Files

| Path | Change |
|------|--------|
| `src/components/home/CategoryTile.tsx` | `size="sidebar"` variant |
| `src/components/categories/CategoryBrowser.tsx` | Finished gutters / divider / counts |
| `src/components/playground/demos.tsx` (+ catalog/usage) | New demo |

## 2026-11-10 — Shorter default cards + keep rails off the wall

### What changed

Default product photo is `aspect-[4/3]` (shorter than square) with tighter title/price spacing. Category + product rails use `scroll-px-5` with `px-5` so `snap-start` no longer pins the first tile/card to the screen edge. Playground product-card / product-section notes updated.

### Files

| Path | Change |
|------|--------|
| `src/components/product/ProductCard.tsx` | 4:3 photo, tighter padding |
| `src/lib/type-scale.ts` / `skeletons.tsx` | Match shorter card |
| `src/components/home/CategoryRail.tsx` | `scroll-px-5` gutter |
| `src/components/home/ProductSection.tsx` | `scroll-px-5` + `px-5` |
| `src/components/playground/demos.tsx` (+ catalog/usage) | Notes |

## 2026-11-10 — Restore default ProductCard size + align home product rail

### What changed

Reverted the short default product image (`h-[5.5rem]`) back to square photos with reserved title height. Home product rails use the same `px-5` side inset as the category strip. Banner curve dead space tightened; CategoryRail left as the other developer designed it. Playground product-card demo shows default + compact.

### Files

| Path | Change |
|------|--------|
| `src/components/product/ProductCard.tsx` | Default image `aspect-square`, price `pt-3` |
| `src/lib/type-scale.ts` | Restore `min-h-10` card title |
| `src/components/ui/skeletons.tsx` | Square skeleton photo |
| `src/components/home/ProductSection.tsx` | Rail `px-5` matches CategoryRail |
| `src/app/(storefront)/home/page.tsx` | Shorter curve / less gap under banners |
| `src/components/playground/demos.tsx` (+ catalog/usage) | Default + compact demo |

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
