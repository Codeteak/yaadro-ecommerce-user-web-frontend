export type PlaygroundStatus = "built" | "planned";

export type PlaygroundEntry = {
  slug: string;
  title: string;
  status: PlaygroundStatus;
  group: string;
  description: string;
  /** Where this wires into the live storefront (or will). */
  wiresTo?: string;
};

/**
 * Component / composition catalog for the in-app playground.
 * Built = live demo. Planned = stub until we implement then wire to ecom.
 */
export const PLAYGROUND_ENTRIES: PlaygroundEntry[] = [
  // ── Navigation ──────────────────────────────────────────────────────
  {
    slug: "back-button",
    title: "BackButton",
    status: "built",
    group: "Navigation",
    description: "Green squircle back control with black arrow (PageHeader, login, cart, profile).",
    wiresTo: "PageHeader, /login, profile, /cart",
  },
  {
    slug: "close-button",
    title: "CloseButton",
    status: "built",
    group: "Navigation",
    description:
      "Green squircle + black X — sheets (address, coupons, weight, flyer).",
    wiresTo: "AddressBookSheet, Coupons, WeightCustomizer, OfferFlyer",
  },
  {
    slug: "page-header",
    title: "PageHeader",
    status: "built",
    group: "Navigation",
    description:
      "Sticky top bar; title hides on scroll, back button stays usable.",
    wiresTo: "Most storefront pages",
  },
  {
    slug: "bottom-nav",
    title: "BottomNav",
    status: "built",
    group: "Navigation",
    description:
      "Pill expand/label + scroll hide. Hidden state uses inert + blur (no aria-hidden focus warning).",
    wiresTo: "Storefront layout (BottomNav)",
  },
  {
    slug: "pull-to-refresh",
    title: "PullToRefresh",
    status: "built",
    group: "Navigation",
    description:
      "Pull spinner under page chrome. Passive touch only (does not block scroll).",
    wiresTo: "Home, profile, wishlist, coupons (not cart — plain scroller)",
  },
  {
    slug: "scroll-to-top",
    title: "ScrollToTopOnLoad",
    status: "built",
    group: "Navigation",
    description: "Disables browser scroll restore and jumps to top on mount.",
    wiresTo: "/home",
  },

  // ── Home ────────────────────────────────────────────────────────────
  {
    slug: "home-top-bar",
    title: "HomeTopBar",
    status: "built",
    group: "Home",
    description:
      "Guest Sign in vs signed-in profile-tick icon (no round background). Storefront stays guest until auth.",
    wiresTo: "/home",
  },
  {
    slug: "deferred-location",
    title: "Deferred location prompt",
    status: "built",
    group: "Home",
    description:
      "Wired `/home`: soft map prompt locks scroll while open; close or route change unlocks. Pin only — details at place order.",
    wiresTo: "/home",
  },
  {
    slug: "pwa-install-prompt",
    title: "PWA install prompt",
    status: "built",
    group: "Home",
    description:
      "Install sheet only on ecom `/home`. Hidden while scroll lock held. Dismiss = sessionStorage.",
    wiresTo: "InstallPrompt on AppProviders → gated to /home",
  },

  {
    slug: "shop-fallback-avatars",
    title: "Shop fallback avatars",
    status: "built",
    group: "Home",
    description:
      "Wired: yellow awning is ecom fallback. Demo still shows all 3 + old og-image.",
    wiresTo: "getShopSeo / HomeTopBar shop.image",
  },
  {
    slug: "search",
    title: "Search",
    status: "built",
    group: "Home",
    description:
      "Gateway pill: typewriter sample hints, tap → /categories?focus=search; filter → chips open. Wired on live /home.",
    wiresTo: "/home, /categories?focus=search",
  },
  {
    slug: "search-placeholder-motion",
    title: "Search placeholder motions",
    status: "built",
    group: "Experiments",
    description:
      "Side-by-side gateway hint animations: fade, tick, blur, scale, word swap, typewriter. Live uses typewriter.",
    wiresTo: "HomeSearchBar placeholderMotion → /home + /categories",
  },
  {
    slug: "multi-phone-layout",
    title: "Multi-phone layout (SE)",
    status: "built",
    group: "Experiments",
    description:
      "Short-viewport profile scroll shell + narrow product card density. Tracks MULTI_PHONE_LAYOUT_PLAN.md (repo root).",
    wiresTo: "/profile scrollport, ProductCard max-[390px]",
  },
  {
    slug: "home-search-categories",
    title: "Home search → categories",
    status: "built",
    group: "Home",
    description:
      "Gateway home search with rotating samples → categories search focused. Same as live /home.",
    wiresTo: "/home → /categories?focus=search",
  },
  {
    slug: "categories-hub",
    title: "Categories hub",
    status: "built",
    group: "Home",
    description:
      "Phase A #2: press scale on hub tiles. Featured rectangles + squares. Confirm keep (shared CategoriesHub / CategoryTile).",
    wiresTo: "Playground reference; see category-browser",
  },
  {
    slug: "category-card-shared",
    title: "CategoryCard (shared)",
    status: "built",
    group: "Home",
    description:
      "Phase B #28: shared CategoryCard(image|icon, name). Wired to live rail, hub, browser, listing.",
    wiresTo:
      "src/components/categories/CategoryCard.tsx → CategoryRail / CategoriesHub / CategoryBrowser / CategoryListing",
  },
  {
    slug: "storefront-shell",
    title: "Storefront shell",
    status: "built",
    group: "Navigation",
    description:
      "Phase B #29: StorefrontPageFrame (PageHeader + body). Wired to /categories, /wishlist, /orders. BottomNav via StorefrontChrome.",
    wiresTo:
      "src/components/storefront/StorefrontPageFrame.tsx → CategoriesPageContent / WishlistPageContent / OrdersPageContent",
  },
  {
    slug: "home-more-sections",
    title: "Home · more sections",
    status: "built",
    group: "Home",
    description:
      "Home stack with per-category horizontal product rails (categoryProductRails). Live /home uses the same pattern.",
    wiresTo:
      "src/lib/home-category-rails.ts → HomePullContent categoryRails on /home",
  },
  {
    slug: "category-browser",
    title: "Category browser (sidebar)",
    status: "built",
    group: "Home",
    description:
      "Legacy sidebar Categories layout. Live /categories now uses horizontal HomeSearchBar + pill CategoryRail.",
    wiresTo: "playground only (legacy)",
  },
  {
    slug: "category-grid",
    title: "Category grid / PLP",
    status: "built",
    group: "Home",
    description:
      "Alias of categories-hub (featured rectangles + PLP flow).",
    wiresTo: "Playground reference; see category-browser",
  },
  {
    slug: "category-plp",
    title: "Category PLP (sidebar)",
    status: "built",
    group: "Home",
    description:
      "Legacy layout: Filter/Brands/Type/Sort chips + left sidebar tiles. Kept for comparison — live ecom uses horizontal.",
    wiresTo: "playground only (legacy)",
  },
  {
    slug: "category-plp-horizontal",
    title: "Category PLP · horizontal rail",
    status: "built",
    group: "Experiments",
    description:
      "HomeSearchBar + home pill CategoryRail + full-width cards. Same as live /categories/[slug].",
    wiresTo: "/categories/[slug]",
  },
  {
    slug: "category-rail",
    title: "CategoryRail",
    status: "built",
    group: "Home",
    description:
      "Style 2 pills (tileVariant=pill) — same as /home under banners. All first; same select/scroll logic.",
    wiresTo: "/home under banners",
  },
  {
    slug: "offer-banners",
    title: "OfferBanners",
    status: "built",
    group: "Home",
    description:
      "Live: full-bleed shop creative only (no text/CTA overlay). Sample mode keeps title + Shop now. Autoplay, dots, swipe.",
    wiresTo: "/home",
  },
  {
    slug: "offer-flyer",
    title: "OfferFlyer",
    status: "built",
    group: "Home",
    description: "Once-per-day sample campaign modal.",
    wiresTo: "/home",
  },
  {
    slug: "product-section",
    title: "ProductSection",
    status: "built",
    group: "Home",
    description:
      "10 or fewer products in one scrolling row. More than 10 split into two rows. Show all → /categories/[slug].",
    wiresTo: "/home, /categories/[slug]",
  },
  {
    slug: "fruits-veggies-section",
    title: "Fruits & veggies section",
    status: "built",
    group: "Home",
    description:
      "Produce BG + All/Fruits/Vegetables (10); Browse all → /categories/fruits or /vegetables. Same on /home.",
    wiresTo: "/home, /categories/fruits|/vegetables",
  },
  {
    slug: "daily-dairy-layouts",
    title: "Daily dairy layouts",
    status: "built",
    group: "Home",
    description:
      "Compare A (live default) vs C. Same art aspect, veggies chips, track See all. Live uses A.",
    wiresTo: "Playground compare · live = A on /home",
  },
  {
    slug: "daily-dairy-section",
    title: "Daily dairy section",
    status: "built",
    group: "Home",
    description:
      "Layout A card (wired). Shows on /home when shelf title matches dairy keywords. See all → /dairy.",
    wiresTo: "/home → See all → /dairy",
  },
  {
    slug: "daily-dairy-page",
    title: "Daily dairy page",
    status: "built",
    group: "Home",
    description:
      "Sticky clear dairy art (no blur) + product grid. Live: /dairy.",
    wiresTo: "/dairy",
  },
  {
    slug: "festive-offers-section",
    title: "Festive offers section",
    status: "built",
    group: "Home",
    description:
      "Image hero (admin shelf title on the card) + 2-col peek. Shows on /home when shelf title matches festive keywords.",
    wiresTo: "/home → See all → /festive",
  },
  {
    slug: "festive-offers-page",
    title: "Festive offers page",
    status: "built",
    group: "Home",
    description:
      "Sticky blurred festive art as page background + normal product grid.",
    wiresTo: "/festive",
  },
  {
    slug: "category-browse-sections",
    title: "Category browse sections",
    status: "built",
    group: "Home",
    description:
      "Phase B #30 aisle grids slice. Full stack: home-more-sections. Live /home stays classic.",
    wiresTo: "Playground only — not on /home",
  },
  {
    slug: "type-scale",
    title: "Type scale (spec)",
    status: "built",
    group: "Home",
    description:
      "Heading size/weight specimen — same spec scale on /home and /categories (card names stay legacy).",
    wiresTo: "/home, /categories",
  },
  {
    slug: "home-product-shelves",
    title: "Home product shelves",
    status: "built",
    group: "Home",
    description:
      "Featured, Most ordered, Favourites — vertical 2-col under produce on /home.",
    wiresTo: "/home",
  },
  {
    slug: "home-pull-content",
    title: "HomePullContent",
    status: "built",
    group: "Home",
    description:
      "ProductSection + FruitsVeggies + merch shelves + BrandFooter + PTR. On /home the category rail streams separately (#3).",
    wiresTo: "/home",
  },
  {
    slug: "brand-footer",
    title: "BrandFooter",
    status: "built",
    group: "Home",
    description: "Muted D + yaadro wordmark at the end of /home and /profile.",
    wiresTo: "/home, /profile",
  },

  // ── Product & cart ──────────────────────────────────────────────────
  {
    slug: "product-card",
    title: "ProductCard",
    status: "built",
    group: "Product & cart",
    description:
      "Shared card: % OFF ribbon clipped clean (no white fringe). Flat on paper. Compact size for rails.",
    wiresTo: "ProductSection, /home, /cart, playground product-card",
  },

  {
    slug: "view-cart-bar",
    title: "ViewCartBar",
    status: "built",
    group: "Product & cart",
    description:
      "Browse FAB: scroll expand + delayed drop vs nav. Path-hidden with BottomNav on cart/checkout/order detail/track/profile tasks.",
    wiresTo: "StorefrontChrome + shouldHideStorefrontNav",
  },
  {
    slug: "weight-customizer",
    title: "WeightCustomizer",
    status: "built",
    group: "Product & cart",
    description:
      "Weight CTA is Add until chosen; then shows kg. Card price is per kg; slide scales kg×price.",
    wiresTo: "Storefront layout + ProductCard + ProductDetail",
  },
  {
    slug: "empty-cart",
    title: "Empty cart state",
    status: "built",
    group: "Product & cart",
    description:
      "Vertically centered empty state (same as wishlist) + Shop now.",
    wiresTo: "/cart",
  },
  {
    slug: "empty-wishlist",
    title: "Empty wishlist state",
    status: "built",
    group: "Product & cart",
    description: "Broken-heart cutout illustration + empty copy + Shop now.",
    wiresTo: "/wishlist",
  },
  {
    slug: "cart-page",
    title: "Cart page",
    status: "built",
    group: "Product & cart",
    description:
      "Phase A wired: #32 solid Checkout CTA + #36 stable line order on live /cart. Playground keeps SAMPLE offers.",
    wiresTo: "/cart",
  },
  {
    slug: "product-detail",
    title: "Product detail (PDP)",
    status: "built",
    group: "Product & cart",
    description:
      "Peeking gallery, Prices-may-vary, weight Add → slide ruler (Oranges 0.1 kg step); then CTA shows kg.",
    wiresTo: "/product/[id]",
  },
  {
    slug: "price-may-vary",
    title: "Prices may vary",
    status: "built",
    group: "Experiments",
    description:
      "Centered soft message (storefront) vs legacy banner. Same notice on cart, checkout, and PDP.",
    wiresTo: "/cart, /checkout, /product/[id]",
  },
  {
    slug: "price-vary-explain",
    title: "Price vary · before checkout",
    status: "built",
    group: "Experiments",
    description:
      "Phase D #33 wired: notice display-only; cart Checkout → explain popup → Continue → checkout. Help topic=price + return stack.",
    wiresTo:
      "CartPageContent PriceMayVaryExplainSheet → /checkout; HelpSupportRoute ?topic=price",
  },

  // ── Auth & onboarding ───────────────────────────────────────────────
  {
    slug: "onboarding-screen",
    title: "OnboardingScreen",
    status: "built",
    group: "Auth & onboarding",
    description: "Welcome hero, brand, swipe-to-login, continue without login.",
    wiresTo: "/",
  },
  {
    slug: "green-corners",
    title: "GreenCornerAccents",
    status: "built",
    group: "Auth & onboarding",
    description: "Soft leaf blobs used behind onboarding / login.",
    wiresTo: "/, /login",
  },
  {
    slug: "swipe-to-login",
    title: "SwipeToLogin",
    status: "built",
    group: "Auth & onboarding",
    description:
      "Swipe control with solid green fill that follows the handle (playground accent preview).",
    wiresTo: "/",
  },
  {
    slug: "phone-otp",
    title: "Phone + OTP inputs",
    status: "built",
    group: "Auth & onboarding",
    description: "+91 phone and 4-digit OTP fields (UI stub).",
    wiresTo: "/login",
  },
  {
    slug: "login-form",
    title: "LoginForm",
    status: "built",
    group: "Auth & onboarding",
    description:
      "Phone → OTP → Welcome to {shop} → /home. Wired on /login with live shop SEO name.",
    wiresTo: "/login, /home",
  },
  {
    slug: "verified-success",
    title: "VerifiedSuccess",
    status: "built",
    group: "Auth & onboarding",
    description:
      "Confirming = spinner (no tick); success = check + Welcome to {shop}. Wired on /login.",
    wiresTo: "/login, /home",
  },

  // ── Storefront chrome ───────────────────────────────────────────────
  {
    slug: "coming-soon",
    title: "ComingSoonPage",
    status: "built",
    group: "Storefront chrome",
    description: "Shared placeholder for stubs (orders, settings…).",
    wiresTo: "/orders, profile/* stubs",
  },
  {
    slug: "not-found",
    title: "404 not found",
    status: "built",
    group: "Storefront chrome",
    description:
      "Lost-explorer illustration + Page not found + Refresh — same as global app/not-found.",
    wiresTo: "app/not-found.tsx",
  },
  {
    slug: "coupons-list",
    title: "Coupons list",
    status: "built",
    group: "Storefront chrome",
    description:
      "Same as /coupons: simplified ticket body (discount → title → code/until), Active/Used/Expired themes.",
    wiresTo: "/coupons",
  },
  {
    slug: "coupons-empty",
    title: "Coupons empty",
    status: "built",
    group: "Storefront chrome",
    description:
      "Signed-in empty: empty-coupons mascot + No coupons yet. Same as /coupons when logged in with no offers.",
    wiresTo: "/coupons",
  },
  {
    slug: "coupons-guest",
    title: "Coupons guest",
    status: "built",
    group: "Storefront chrome",
    description:
      "Logged-out coupons gate: empty-coupons mascot + Sign in button → /login?next=/coupons.",
    wiresTo: "/coupons (guest)",
  },
  {
    slug: "profile-header",
    title: "Profile page",
    status: "built",
    group: "Storefront chrome",
    description:
      "Live ProfileScreen: mint→white desk hero, large avatar + name row, options list, Logout. Guest / signed-in / error / offline.",
    wiresTo: "/profile",
  },
  {
    slug: "profile-options-refine",
    title: "Profile options · refine",
    status: "built",
    group: "Storefront chrome",
    description:
      "Desk menu rows (brand icons, guest Sign in chips). Same ProfileOptionsList as live /profile.",
    wiresTo: "/profile",
  },
  {
    slug: "help-support",
    title: "Help & Support",
    status: "built",
    group: "Storefront chrome",
    description:
      "Wired ecom `/profile/support`. Contact us + Details expand; phone/address via NEXT_PUBLIC_SHOP_SUPPORT_* until API exposes them.",
    wiresTo: "/profile/support",
  },

  // ── Planned (implement here first, then wire) ───────────────────────
  {
    slug: "checkout",
    title: "Checkout flow",
    status: "built",
    group: "Product & cart",
    description:
      "Pin-only → Place Order opens address details. Full details required to submit. Guest → login.",
    wiresTo: "/checkout, /login, /cart",
  },
  {
    slug: "checkout-coupon",
    title: "Checkout · coupon totals",
    status: "built",
    group: "Product & cart",
    description:
      "Phase A #34 wired + coupon −₹ fixture. Live row only after shop preview applies a real code.",
    wiresTo: "/checkout",
  },
  {
    slug: "order-placed",
    title: "Order placed",
    status: "built",
    group: "Product & cart",
    description:
      "Post-checkout confirmation: mascot, bill summary, Order history + Home. Same as /checkout after Place Order.",
    wiresTo: "/checkout (after Place Order)",
  },
  {
    slug: "orders-list",
    title: "Orders list",
    status: "built",
    group: "Product & cart",
    description:
      "Wired: parcel + order id header; status badge + pulse on in-progress.",
    wiresTo: "/orders",
  },
  {
    slug: "order-detail",
    title: "Order detail",
    status: "built",
    group: "Product & cart",
    description:
      "Wired: nested lines scroll (5+); scroll hint when 7+. Playground default ord-1050. Live: /orders/[id].",
    wiresTo: "/orders/[id]",
  },
  {
    slug: "order-bill-coupon",
    title: "Order bill · coupon",
    status: "built",
    group: "Product & cart",
    description:
      "Fix: Coupon (CODE) uses coupon_discount_minor — ignores inflated promotion_discount_total. Item − coupon + delivery = total (not ₹0).",
    wiresTo:
      "mapCustomerOrder + billedTotal → /orders/[id] bill, ticket, receipt",
  },
  {
    slug: "live-order-track",
    title: "Live order track",
    status: "built",
    group: "Product & cart",
    description:
      "Accepted/Packed: track page + waiting for partner. OFD + rider: Live Track. Wired: /orders/[id]/track loads live orders.",
    wiresTo: "/orders/[id]/track",
  },
  {
    slug: "empty-orders",
    title: "Empty orders state",
    status: "built",
    group: "Product & cart",
    description:
      "Signed-in empty: empty-orders-v2.png mascot + No orders yet + Shop now. Same as /orders when logged in with no history.",
    wiresTo: "/orders",
  },
  {
    slug: "orders-guest",
    title: "Orders guest",
    status: "built",
    group: "Product & cart",
    description:
      "Logged-out orders gate: empty-orders-v2.png mascot + Sign in button → /login?next=/orders.",
    wiresTo: "/orders (guest)",
  },
  {
    slug: "address-modal-shared",
    title: "Address modal (shared)",
    status: "built",
    group: "Product & cart",
    description:
      "Phase C #31+#35 wired: profile address card + checkout/home Edit with editId. /profile/addresses redirects to /profile?address=1.",
    wiresTo:
      "ProfileAddressCard + CheckoutPageContent / HomeTopBar AddressBookSheet(editId)",
  },
  {
    slug: "address-book",
    title: "Saved addresses",
    status: "built",
    group: "Product & cart",
    description:
      "One saved address. Same AddressBookSheet as /checkout, home Deliver to, and /profile.",
    wiresTo: "/checkout, /home, /profile",
  },
  {
    slug: "address-manage",
    title: "Address management",
    status: "built",
    group: "Product & cart",
    description:
      "One address: edit or delete. Add only when none is saved. Same as /profile. Prefer address-modal-shared for #31/#35.",
    wiresTo: "/profile",
  },
  {
    slug: "address-map",
    title: "Address map (stub)",
    status: "built",
    group: "Product & cart",
    description:
      "Map step: Places suggestions as you type (no Search button) + Detect card. Close (X) only.",
    wiresTo: "AddressLocationControls / AddressMapStep",
  },
  {
    slug: "address-details",
    title: "Address details",
    status: "built",
    group: "Product & cart",
    description:
      "Edit address: Places suggestions + Detect card, then form fields. Close (X) only.",
    wiresTo: "AddressLocationControls / AddressDetailsStep",
  },
  {
    slug: "coupons-apply",
    title: "Coupons apply",
    status: "built",
    group: "Product & cart",
    description:
      "Select active coupon → Apply to cart → return. Same as ecom /coupons?from=cart.",
    wiresTo: "/coupons?from=cart, /cart",
  },
  {
    slug: "wishlist-list",
    title: "Wishlist list",
    status: "built",
    group: "Product & cart",
    description:
      "Signed-in grid; heart removes. Same WishlistPageContent as /wishlist (demo is seeded).",
    wiresTo: "/wishlist",
  },
  {
    slug: "wishlist-guest-heart",
    title: "Wishlist guest heart",
    status: "built",
    group: "Product & cart",
    description:
      "Playground guest path: heart → /login. Storefront saves locally until session API.",
    wiresTo: "ProductCard, /login",
  },
  {
    slug: "skeletons",
    title: "Loading skeletons",
    status: "built",
    group: "Storefront chrome",
    description:
      "Shared pulse bones — home hero (no Yaadro flash), loading.tsx, product/PLP/hub/order Suspense.",
    wiresTo: "HomeHeroSkeleton on /home; loading.tsx, /product, /categories, /orders/[id]",
  },
  {
    slug: "toasts",
    title: "Toast / snackbar",
    status: "built",
    group: "Storefront chrome",
    description:
      "Theme island snackbars + location/delivery copy (#26). Wired on checkout + address book; lab mirrors the same strings.",
    wiresTo: "src/components/ui/Toast.tsx via AppProviders",
  },
];

export function getPlaygroundEntry(slug: string) {
  return PLAYGROUND_ENTRIES.find((e) => e.slug === slug);
}

export function playgroundGroups() {
  const map = new Map<string, PlaygroundEntry[]>();
  for (const entry of PLAYGROUND_ENTRIES) {
    const list = map.get(entry.group) ?? [];
    list.push(entry);
    map.set(entry.group, list);
  }
  return [...map.entries()];
}
