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
    description: "Green squircle back control with black arrow (PageHeader, cart, profile).",
    wiresTo: "PageHeader, login, profile, /cart",
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
    wiresTo: "/home hero",
  },
  {
    slug: "category-rail",
    title: "CategoryRail",
    status: "built",
    group: "Home",
    description: "Infinite horizontal category circles with center selection.",
    wiresTo: "/home under hero curve",
  },
  {
    slug: "offer-banners",
    title: "OfferBanners",
    status: "built",
    group: "Home",
    description: "Sample offer carousel (transform-based loop).",
    wiresTo: "/home below categories",
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
    description: "Banners + products wrapped in pull-to-refresh (under categories).",
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
      "Cart list, Deliver to Change → address sheet, promo Apply, totals; no bottom nav. Checkout not faked.",
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
      "Voucher-style cards, details sheet, copy code (same component as /coupons; sample data).",
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
    slug: "category-grid",
    title: "Category grid / PLP",
    status: "planned",
    group: "Planned",
    description: "Full category browse + product listing from catalog API.",
    wiresTo: "/categories",
  },
  {
    slug: "search",
    title: "Search",
    status: "planned",
    group: "Planned",
    description: "Search field, suggestions, results list.",
    wiresTo: "/search",
  },
  {
    slug: "checkout",
    title: "Checkout flow",
    status: "planned",
    group: "Planned",
    description: "Address, slot, payment, place order (server-authoritative).",
    wiresTo: "/checkout",
  },
  {
    slug: "order-tracking",
    title: "Order tracking",
    status: "planned",
    group: "Planned",
    description: "Order list + status timeline.",
    wiresTo: "/orders",
  },
  {
    slug: "address-book",
    title: "Address book CRUD",
    status: "planned",
    group: "Planned",
    description: "Saved addresses with detect / map (beyond localStorage).",
    wiresTo: "/profile/addresses",
  },
  {
    slug: "coupons-apply",
    title: "Coupons apply",
    status: "planned",
    group: "Planned",
    description:
      "Server-authoritative apply on checkout. Local promo UI preview lives on playground cart-page.",
    wiresTo: "/coupons, checkout",
  },
  {
    slug: "wishlist-list",
    title: "Wishlist list",
    status: "planned",
    group: "Planned",
    description: "Persisted wishlist products with add-to-cart.",
    wiresTo: "/wishlist",
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
