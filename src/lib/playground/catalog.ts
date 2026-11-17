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
      "Floating pill on main tabs. Path-hidden on cart/checkout/order detail/profile tasks. Also hides on scroll-down (window or nested panels like /categories).",
    wiresTo: "Storefront layout (BottomNav)",
  },
  {
    slug: "pull-to-refresh",
    title: "PullToRefresh",
    status: "built",
    group: "Navigation",
    description: "UI-only pull spinner under page chrome. API later.",
    wiresTo: "Home under categories; other storefront bodies",
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
    slug: "search",
    title: "Search",
    status: "built",
    group: "Home",
    description:
      "Pill search + green filter chip. Home: search → categories focus; filter → categories with chips open. Categories: filter toggles chip row.",
    wiresTo: "/home, /categories",
  },
  {
    slug: "home-search-categories",
    title: "Home search → categories",
    status: "built",
    group: "Home",
    description:
      "Tap home search → categories hub with search focused. Same as /home.",
    wiresTo: "/home → /categories?focus=search",
  },
  {
    slug: "categories-hub",
    title: "Categories hub",
    status: "built",
    group: "Home",
    description:
      "Featured rectangle tiles + squares (older hub composition). Live /categories now uses category-browser.",
    wiresTo: "Playground reference; see category-browser",
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
    description: "Sample offer carousel under search on /home.",
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
    slug: "category-browse-sections",
    title: "Category browse sections",
    status: "built",
    group: "Home",
    description:
      "Playground-only candidate home: FruitsVeggies then aisle grids (mint plates, rect-first). Live /home stays classic (rail + shelves).",
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
      "ProductSection + FruitsVeggies + merch shelves + BrandFooter + PTR on /home (classic).",
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
      "Default 3:2 denser card (~152px) on home + cart “You may also like”. Flat on paper (ring, no drop shadow). Compact size kept for reference.",
    wiresTo: "ProductSection, /home, /cart, /product/[id]",
  },
  {
    slug: "view-cart-bar",
    title: "ViewCartBar",
    status: "built",
    group: "Product & cart",
    description: "Idle circular cart / expanded View cart bar while scrolling.",
    wiresTo: "Storefront layout",
  },
  {
    slug: "weight-customizer",
    title: "WeightCustomizer",
    status: "built",
    group: "Product & cart",
    description: "Ruler sheet for by-weight products.",
    wiresTo: "Storefront layout + ProductCard",
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
      "Cart list, Add more + suggestions (same default ProductCard as home), prices-may-vary, coupon, Checkout.",
    wiresTo: "/cart",
  },
  {
    slug: "product-detail",
    title: "Product detail (PDP)",
    status: "built",
    group: "Product & cart",
    description:
      "Peeking gallery, centered Prices-may-vary message, price, optional description/ingredients, qty, related.",
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
    description: "Full phone → OTP → verified flow (UI-only stub).",
    wiresTo: "/login",
  },
  {
    slug: "verified-success",
    title: "VerifiedSuccess",
    status: "built",
    group: "Auth & onboarding",
    description: "Post-OTP verified animation before storefront.",
    wiresTo: "/login",
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
    title: "Profile header",
    status: "built",
    group: "Storefront chrome",
    description:
      "Guest Sign in vs signed-in default avatar. Title is `{shopName} Member` per supermarket (or real displayName). Same on /profile.",
    wiresTo: "/profile",
  },

  // ── Planned (implement here first, then wire) ───────────────────────
  {
    slug: "checkout",
    title: "Checkout flow",
    status: "built",
    group: "Product & cart",
    description:
      "Address, COD, prices-may-vary, Place Order → Order placed (mascot + bill card + View Order / Back home).",
    wiresTo: "/checkout",
  },
  {
    slug: "order-placed",
    title: "Order placed",
    status: "built",
    group: "Product & cart",
    description:
      "Post-checkout confirmation: existing mascot PNG, bill summary, View Order + Back to home. Same as checkout confirmed phase.",
    wiresTo: "/checkout (after Place Order)",
  },
  {
    slug: "orders-list",
    title: "Orders list",
    status: "built",
    group: "Product & cart",
    description:
      "Same as /orders: green Orders header, ticket cards, steps, Review and bill.",
    wiresTo: "/orders",
  },
  {
    slug: "order-detail",
    title: "Order detail",
    status: "built",
    group: "Product & cart",
    description:
      "Same as /orders/[id]: forest header, 3 steps, Track order → /orders/[id]/track, ticket bill, review.",
    wiresTo: "/orders/[id]",
  },
  {
    slug: "live-order-track",
    title: "Live order track",
    status: "built",
    group: "Product & cart",
    description:
      "Tracking UI (mascots, progress, OFD map, partner call). Download Bill = same ticket as order details. Ecom: /orders/[id]/track (separate from details).",
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
    slug: "address-book",
    title: "Saved addresses",
    status: "built",
    group: "Product & cart",
    description:
      "One saved address. Same AddressBookSheet as /checkout, home Deliver to, and /profile/addresses.",
    wiresTo: "/checkout, /home, /profile/addresses",
  },
  {
    slug: "address-manage",
    title: "Address management",
    status: "built",
    group: "Product & cart",
    description:
      "One address: edit or delete. Add only when none is saved. Same as /profile/addresses.",
    wiresTo: "/profile/addresses",
  },
  {
    slug: "address-map",
    title: "Address map (stub)",
    status: "built",
    group: "Product & cart",
    description:
      "Stub map + search + Detect my location (no live Maps API). Confirm → details.",
    wiresTo: "AddressBookSheet",
  },
  {
    slug: "address-details",
    title: "Address details",
    status: "built",
    group: "Product & cart",
    description:
      "House/Office/Other, save name, building, and instructions. Replaces the one saved address.",
    wiresTo: "AddressBookSheet",
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
      "Shared pulse bones — same as storefront loading.tsx + product/PLP/hub/order Suspense.",
    wiresTo: "loading.tsx, /product, /categories, /orders/[id]",
  },
  {
    slug: "toasts",
    title: "Toast / snackbar",
    status: "built",
    group: "Storefront chrome",
    description:
      "Theme island snackbars at the top (success / error / info / warning). showPopup(message, type) — wired storefront-wide.",
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
