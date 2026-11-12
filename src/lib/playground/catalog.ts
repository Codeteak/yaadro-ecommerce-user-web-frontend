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
    title: "Category browser",
    status: "built",
    group: "Home",
    description:
      "Live /categories: search filter toggles Filter/Brands/Type/Sort chips; each opens its sheet. Sidebar tiles + products.",
    wiresTo: "/categories",
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
    title: "Category PLP",
    status: "built",
    group: "Home",
    description:
      "Shared Filter/Brands/Type/Sort chips + sidebar tiles. Same as /categories/[slug] (Fruits/Veggies Browse all).",
    wiresTo: "/categories/[slug]",
  },
  {
    slug: "category-rail",
    title: "CategoryRail",
    status: "built",
    group: "Home",
    description:
      "Flat category strip (All first). Side gutter via px-5 + scroll-px-5. Missing photos use the category placeholder.",
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
      "ProductSection + FruitsVeggies + merch shelves + BrandFooter + PTR on /home.",
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
      "Default 3:2 denser card (home rails ~152px) + compact cart size. Ribbon, heart, add/weight stepper. Missing photos use the grocery-bag placeholder.",
    wiresTo: "ProductSection, /home, /product/[id], cart suggestions",
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
      "Cart list, Add more + suggestions (playground), prices-may-vary, coupon, Checkout. Wire suggestions when ready.",
    wiresTo: "/cart",
  },
  {
    slug: "product-detail",
    title: "Product detail (PDP)",
    status: "built",
    group: "Product & cart",
    description:
      "Peeking gallery, price, optional description/ingredients, qty, related. Includes a no-photo product that shows the grocery-bag placeholder.",
    wiresTo: "/product/[id]",
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
      "Ticket coupons with per-id colours, Active/Used/Expired themes; tap for details/copy.",
    wiresTo: "/coupons",
  },
  {
    slug: "coupons-empty",
    title: "Coupons empty",
    status: "built",
    group: "Storefront chrome",
    description:
      "Empty coupons illustration + copy (same empty UI as /coupons when list is empty).",
    wiresTo: "/coupons",
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
      "Address, COD, “Prices may vary…” warning banner, totals, Place Order stub. Same as /checkout.",
    wiresTo: "/checkout",
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
      "Same as /orders/[id]: forest header, 3 steps, bill, partner, timeline, review.",
    wiresTo: "/orders/[id]",
  },
  {
    slug: "empty-orders",
    title: "Empty orders state",
    status: "built",
    group: "Product & cart",
    description: "Same empty state as /orders when there are no orders.",
    wiresTo: "/orders",
  },
  {
    slug: "address-book",
    title: "Saved addresses",
    status: "built",
    group: "Product & cart",
    description:
      "List + select + star + Add; same AddressBookSheet as /checkout, home Deliver to, /profile/addresses.",
    wiresTo: "/checkout, /home, /profile/addresses",
  },
  {
    slug: "address-manage",
    title: "Address management",
    status: "built",
    group: "Product & cart",
    description:
      "Manage list: black pin, Default, star / edit / delete, Add New Address. Same as /profile/addresses.",
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
      "House/Office/Other, save name, building, default, instructions → save to book.",
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
    status: "planned",
    group: "Planned",
    description: "Success / error feedback for cart and forms.",
    wiresTo: "Global chrome",
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
