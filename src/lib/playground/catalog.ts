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
      "Floating pill nav — green active pill, black icons/labels (storefront layout).",
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
    description: "Shop avatar + name, Deliver to, Sign in; address bottom sheet.",
    wiresTo: "/home",
  },
  {
    slug: "search",
    title: "Search",
    status: "built",
    group: "Home",
    description:
      "Pill search + green filter chip. On /home, tap opens /categories?focus=search.",
    wiresTo: "/home → /categories?focus=search",
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
      "Fresh: rect-first + squares. Drinks: square then rect. Same as /categories.",
    wiresTo: "/categories",
  },
  {
    slug: "category-grid",
    title: "Category grid / PLP",
    status: "built",
    group: "Home",
    description:
      "Alias of categories-hub (featured rectangles + PLP flow).",
    wiresTo: "/categories",
  },
  {
    slug: "category-plp",
    title: "Category PLP",
    status: "built",
    group: "Home",
    description:
      "PageHeader title, filters, left rail, 2-col grid. Same as /categories/[slug].",
    wiresTo: "/categories/[slug]",
  },
  {
    slug: "category-rail",
    title: "CategoryRail",
    status: "built",
    group: "Home",
    description: "Infinite horizontal category circles with center selection.",
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
    description: "Sample product grid for the selected home category.",
    wiresTo: "/home",
  },
  {
    slug: "home-pull-content",
    title: "HomePullContent",
    status: "built",
    group: "Home",
    description: "Product grid + pull-to-refresh under categories.",
    wiresTo: "/home",
  },

  // ── Product & cart ──────────────────────────────────────────────────
  {
    slug: "product-card",
    title: "ProductCard",
    status: "built",
    group: "Product & cart",
    description: "Card with ribbon, wishlist heart, add / weight stepper.",
    wiresTo: "ProductSection, /product/[id]",
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
    description: "Smooth cutout illustration + empty copy + Shop now.",
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
      "Cart list, discount field (green shell), coupon in totals, 3D Checkout pill. Checkout not faked.",
    wiresTo: "/cart",
  },
  {
    slug: "product-detail",
    title: "Product detail (PDP)",
    status: "built",
    group: "Product & cart",
    description:
      "Peeking gallery, price, optional description/ingredients, qty, related.",
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
      "Mint hero with transparent PageHeader (surface=hero); same as /profile.",
    wiresTo: "/profile",
  },

  // ── Planned (implement here first, then wire) ───────────────────────
  {
    slug: "checkout",
    title: "Checkout flow",
    status: "built",
    group: "Product & cart",
    description:
      "Address, COD, price details + coupon, Place Order → tick → mascot. Same as /checkout.",
    wiresTo: "/checkout",
  },
  {
    slug: "orders-list",
    title: "Orders list",
    status: "built",
    group: "Product & cart",
    description:
      "Same as /orders: grocery cards — status chip, thumbs +N, View Details → /orders/[id].",
    wiresTo: "/orders",
  },
  {
    slug: "order-detail",
    title: "Order detail",
    status: "built",
    group: "Product & cart",
    description:
      "Same as /orders/[id]: ORDER STATUS vertical steps + Lucide icons + times.",
    wiresTo: "/orders/[id]",
  },
  {
    slug: "empty-orders",
    title: "Empty orders state",
    status: "built",
    group: "Product & cart",
    description: "No orders yet empty state + Shop now.",
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
    status: "planned",
    group: "Planned",
    description: "Card / list / hero skeletons for API waits.",
    wiresTo: "Catalog surfaces",
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
