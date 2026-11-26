"use client";

import {
  Suspense,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/navigation/BackButton";
import { CloseButton } from "@/components/navigation/CloseButton";
import { BottomNav } from "@/components/navigation/BottomNav";
import {
  NavScrollProvider,
  useNavScroll,
} from "@/components/navigation/NavScrollContext";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  PullToRefresh,
  type PullToRefreshHandle,
} from "@/components/navigation/PullToRefresh";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import {
  HOME_SEARCH_SAMPLE_TERMS,
  HomeSearchBar,
  SEARCH_PLACEHOLDER_MOTION_OPTIONS,
} from "@/components/home/HomeSearchBar";
import { CategoryRail } from "@/components/home/CategoryRail";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import { HOME_CATEGORIES } from "@/lib/home-categories";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { ProductSection } from "@/components/home/ProductSection";
import { DailyDairyPageContent } from "@/components/home/DailyDairyPageContent";
import {
  DailyDairyLayoutLabel,
  DailyDairySection,
} from "@/components/home/DailyDairySection";
import {
  SAMPLE_DAIRY_SHELF,
  SAMPLE_DAIRY_SHELF_PRODUCTS_ONLY,
} from "@/lib/daily-dairy";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { FestiveOffersPageContent } from "@/components/home/FestiveOffersPageContent";
import { FestiveOffersSection } from "@/components/home/FestiveOffersSection";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { HomePullContent } from "@/components/home/HomePullContent";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { CategoriesHub } from "@/components/categories/CategoriesHub";
import { CategoryBrowser } from "@/components/categories/CategoryBrowser";
import { CategoryListing } from "@/components/categories/CategoryListing";
import type { CategoryBranch } from "@/lib/api/storefront";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { useCart } from "@/components/cart/CartContext";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import {
  OrderPlacedContent,
  SAMPLE_ORDER_PLACED,
} from "@/components/checkout/OrderPlacedContent";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";
import { getDefaultCatalogSlug } from "@/lib/catalog-taxonomy";
import {
  getProductsByCategory,
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";
import { STOREFRONT_NAV_HIDDEN_PATHS } from "@/lib/storefront-nav";
import { OrdersPageContent } from "@/components/orders/OrdersPageContent";
import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";
import { LiveOrderTrackDemo } from "@/components/orders/LiveOrderTrack";
import { DeferredLocationPrompt } from "@/components/delivery/DeferredLocationPrompt";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { HelpSupportContent } from "@/components/profile/HelpSupportContent";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import type { CustomerProfile } from "@/lib/api/profile";
import { SAMPLE_SHOP_SUPPORT } from "@/lib/sample-shop-support";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import {
  pickDefaultProfileAvatar,
} from "@/lib/default-profile-avatar";
import { SwipeToLogin } from "@/components/onboarding/SwipeToLogin";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { GreenCornerAccents } from "@/components/onboarding/GreenCornerAccents";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";
import { NotFoundContent } from "@/components/storefront/NotFoundContent";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import {
  CategoriesHubSkeleton,
  CategoryPlpSkeleton,
  HomeHeroSkeleton,
  HomeShelfSkeleton,
  ProductCardSkeleton,
  ProductDetailSkeleton,
  ProductGridSkeleton,
  ProductRailSkeleton,
  StorefrontPageSkeleton,
} from "@/components/ui/skeletons";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { PhoneInput } from "@/features/auth/PhoneInput";
import { OtpInput } from "@/features/auth/OtpInput";
import { LoginForm } from "@/features/auth/LoginForm";
import { VerifiedSuccess } from "@/features/auth/VerifiedSuccess";
import { getPlaygroundEntry } from "@/lib/playground/catalog";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { TYPE_SCALE } from "@/lib/type-scale";
import { ToastDemo } from "@/components/playground/ToastDemo";
import { PhaseBCategoryCardDemo } from "@/components/playground/PhaseBCategoryCardDemo";
import { PhaseBShellDemo } from "@/components/playground/PhaseBShellDemo";
import { PhaseBHomeSectionsDemo } from "@/components/playground/PhaseBHomeSectionsDemo";
import { PhaseCAddressModalDemo } from "@/components/playground/PhaseCAddressModalDemo";
import { PhaseDPriceVaryExplainDemo } from "@/components/playground/PhaseDPriceVaryExplainDemo";
import { OrderBillCouponFixDemo } from "@/components/playground/OrderBillCouponFixDemo";
import { ProfileOptionsRefineDemo } from "@/components/playground/ProfileOptionsRefineDemo";
import { DeliveryRadiusMapDemo } from "@/components/playground/DeliveryRadiusMapDemo";
import { HomeSectionSortDemo } from "@/components/playground/HomeSectionSortDemo";
import {
  SHOP_FALLBACK_AVATAR_OPTIONS,
  SHOP_IMAGE_FALLBACK_CURRENT,
} from "@/lib/shop-fallback-avatars";
import { DemoFrame } from "./DemoFrame";
import { PlannedStub } from "./PlannedStub";

const WISHLIST_SEED_IDS = ["fr-1", "vg-1", "sn-1", "bv-1"];

/** Playground-only row so the missing-photo placeholder can be reviewed. */
const NO_PHOTO_PRODUCT: SampleProduct = {
  id: "playground-no-photo",
  category: "Grocery",
  name: "No photo yet",
  unit: "1 pc",
  price: 40,
  mrp: 40,
  image: "",
};

const PDP_SAMPLES = [
  ...SAMPLE_PRODUCTS.filter(
    (p) =>
      p.id === "fr-2" || // Nagpur Oranges — 0.1 kg unit_size weight demo
      p.id === "vg-3" ||
      p.id === "fr-4" ||
      p.id === "sn-3" ||
      p.id === "fr-1",
  ),
  NO_PHOTO_PRODUCT,
];

function ProductDetailDemo() {
  const [product, setProduct] = useState<SampleProduct>(
    () => PDP_SAMPLES[0] ?? SAMPLE_PRODUCTS[0],
  );

  return (
    <DemoFrame note="Same as /product/[id]. Weight: Add → slide ruler; then CTA shows chosen kg. Total = kg × price per kg.">
      <div className="relative">
        <div className="flex flex-wrap gap-2 border-b border-forest/8 px-4 py-3">
          {PDP_SAMPLES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProduct(p)}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                product.id === p.id
                  ? "bg-track text-white"
                  : "bg-mint/70 text-forest hover:bg-mint"
              }`}
            >
              {p.name.split(" ").slice(0, 2).join(" ")}
              {p.ingredients ? " · +ing" : ""}
            </button>
          ))}
        </div>
        <div className="max-h-[70vh] overflow-y-auto pb-20">
          <ProductDetail
            key={product.id}
            product={product}
            backHref="/playground"
            showPriceMayVary
          />
        </div>
        <ViewCartBar position="inline" />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  );
}

function MiniPhoneOtp() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  return (
    <div className="space-y-6 px-5 py-6">
      <PhoneInput value={phone} onChange={setPhone} />
      <OtpInput value={otp} onChange={setOtp} />
    </div>
  );
}

function TypeScaleSpecimen() {
  const t = useTypeScale();
  const rows: { label: string; className: string; sample: string }[] = [
    {
      label: "Home section",
      className: t.homeSectionHeading,
      sample: "Featured products",
    },
    {
      label: "Home compact",
      className: t.homeCompactHeading.replace(/text-white/g, "text-ink"),
      sample: "Fruits & Vegetables",
    },
    {
      label: "PLP page title",
      className: t.plpPageTitle
        .replace("absolute left-1/2 max-w-[58%] -translate-x-1/2 text-center ", "")
        .replace("truncate ", ""),
      sample: "Fresh vegetables",
    },
    {
      label: "Category grid",
      className: t.categoryGridHeading,
      sample: "Grocery staples",
    },
    {
      label: "Search results",
      className: t.searchResultsHeading,
      sample: "Products",
    },
    {
      label: "PLP filter",
      className: t.plpFilterHeading,
      sample: "All items",
    },
    {
      label: "Product card name",
      className: t.productCardName.replace("mt-3 line-clamp-2 min-h-10 ", ""),
      sample: "Bell Peppers Trio",
    },
  ];

  return (
    <DemoFrame
      note={`TypeScale “spec” on playground + storefront (${Object.keys(TYPE_SCALE.spec).length} tokens). Card names stay legacy.`}
    >
      <div className="space-y-6 bg-paper px-5 py-6">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-black/[0.06] pb-4">
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
              {row.label}
            </p>
            <p className={row.className}>{row.sample}</p>
          </div>
        ))}
        <p className="text-[12px] leading-5 text-muted">
          Also preview on{" "}
          <span className="font-semibold text-ink">home-product-shelves</span>,{" "}
          <span className="font-semibold text-ink">home-pull-content</span>,{" "}
          <span className="font-semibold text-ink">categories-hub</span>, and{" "}
          <span className="font-semibold text-ink">category-listing</span>.
        </p>
      </div>
    </DemoFrame>
  );
}

function WeightCustomizerDemo() {
  const { setCustomizing } = useCart();
  // Prefer Orange (0.1 kg step) — matches live catalog unit_size.
  const product =
    SAMPLE_PRODUCTS.find((p) => p.id === "fr-2") ??
    SAMPLE_PRODUCTS.find((p) => p.customization) ??
    SAMPLE_PRODUCTS[0];
  const minKg = product.customization?.minKg ?? 0.1;

  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm text-muted">
        Same as ecom: card shows min-step price (₹{product.price}/kg × {minKg} kg).
        Add opens the slide at min; after confirm, cards show chosen kg.
      </p>
      <button
        type="button"
        onClick={() => setCustomizing(product)}
        className="mt-4 inline-flex h-11 items-center rounded-2xl bg-track px-5 text-sm font-semibold text-black transition hover:bg-leaf-bright"
      >
        Add
      </button>
      <WeightCustomizer />
    </div>
  );
}

function PullDemo() {
  const ptrRef = useRef<PullToRefreshHandle>(null);
  const [busy, setBusy] = useState(false);

  const runDemo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ptrRef.current?.triggerRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[360px]">
      <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-3">
        <p className="text-sm font-semibold text-forest">
          Chrome stays put (pretend header)
        </p>
        <button
          type="button"
          onClick={() => void runDemo()}
          disabled={busy}
          className="shrink-0 cursor-pointer rounded-full bg-track px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          {busy ? "Refreshing…" : "Demo refresh"}
        </button>
      </div>
      <PullToRefresh ref={ptrRef}>
        <div className="space-y-3 px-5 py-6">
          <p className="text-sm text-muted">
            Use <span className="font-semibold text-ink">Demo refresh</span> on
            desktop, or pull down on a touch device at scroll top. Scroll always
            wins — PTR never calls preventDefault.
          </p>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-14 rounded-2xl bg-mint/50 ring-1 ring-leaf/15"
            />
          ))}
        </div>
      </PullToRefresh>
    </div>
  );
}

function CategoriesFlowDemo({
  start,
}: {
  start: "hub" | "plp" | "home-search";
}) {
  const [view, setView] = useState<"home-search" | "hub" | "plp">(
    start === "plp" ? "plp" : start === "home-search" ? "home-search" : "hub",
  );
  const [slug, setSlug] = useState(getDefaultCatalogSlug());
  const [focusSearch, setFocusSearch] = useState(start === "home-search");

  if (view === "home-search") {
    return (
      <DemoFrame note="Gateway home search: rotating samples; tap → categories hub with search focused (playground).">
        <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-6 pb-10">
          <p className="text-[13px] font-bold text-forest">Home (demo)</p>
          <HomeSearchBar
            className="mt-4"
            placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
            placeholderMotion="typewriter"
            onActivate={() => {
              setFocusSearch(true);
              setView("hub");
            }}
          />
        </div>
      </DemoFrame>
    );
  }

  if (view === "plp") {
    return (
      <DemoFrame
        surface="bare"
        note="Legacy PLP: Filter/Brands/Type/Sort chips + left sidebar tiles (kept for comparison). Live ecom uses horizontal rail."
      >
        <div className="relative h-[78vh] overflow-hidden rounded-2xl bg-[#f7f8f7] ring-1 ring-black/5">
          <CategoryListing
            slug={slug}
            railLayout="sidebar"
            onBack={() => setView("hub")}
            onSearchClick={() => {
              setFocusSearch(true);
              setView("hub");
            }}
          />
          <WeightCustomizer />
        </div>
      </DemoFrame>
    );
  }

  return (
    <DemoFrame note="Phase A #2: press scale on hub tiles + category chips. Fresh/Drinks layout same; tap → PLP. Wire already in shared tiles — confirm keep.">
      <div className="relative max-h-[78vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
        <CategoriesHub
          focusSearch={focusSearch}
          imageFallback={CATEGORY_IMAGE_FALLBACK}
          previewMissingPhoto
          onSelectCategory={(cat) => {
            if (cat.slug === "no-photo") return;
            setSlug(cat.slug);
            setFocusSearch(false);
            setView("plp");
          }}
        />
      </div>
    </DemoFrame>
  );
}

function AddressBookDemo({
  initialStep,
  note,
}: {
  initialStep: "list" | "map" | "details";
  note?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <DemoFrame
      note={
        note ??
        "Saved list → Add → map (search + Detect in field) → details. Close (X) only — no back. No live Maps API."
      }
    >
      <div className="relative flex min-h-[20rem] flex-col items-center justify-center gap-3 bg-paper px-5 py-10">
        <p className="text-center text-sm text-muted">
          Sheet opens over the playground. Close and reopen to reset.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 rounded-full bg-track px-5 text-sm font-semibold text-black"
        >
          Open address flow
        </button>
      </div>
      <AddressBookSheet
        open={open}
        onOpenChange={setOpen}
        initialStep={initialStep === "details" ? "map" : initialStep}
      />
    </DemoFrame>
  );
}

function OrderDetailLeadDemo() {
  const id = useSearchParams().get("id") ?? "ord-1050";
  return (
    <DemoFrame note="Wired ecom: nested lines scroll (5+); hint when 7+. Default ord-1050. Bill coupon math: see order-bill-coupon.">
      <div className="relative max-h-[75vh] overflow-y-auto overscroll-contain bg-white">
        <OrderDetailPageContent orderId={id} ticketBill nestedLinesScroll />
      </div>
    </DemoFrame>
  );
}

/** Horizontal PLP preview — island rail + floating BottomNav like live ecom. */
function CategoryPlpHorizontalDemo() {
  const { navHidden } = useNavScroll();
  const style = {
    ["--storefront-nav-clearance" as string]: navHidden ? "0px" : "5.5rem",
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className="relative flex h-[78vh] min-h-0 flex-col overflow-hidden rounded-2xl bg-paper ring-1 ring-black/5"
    >
      <CategoryListing
        slug="vegetables"
        backHref="/playground"
        railLayout="horizontal"
      />
      <BottomNav position="inline" />
    </div>
  );
}

/** BottomNav playground: clearance collapses with scroll-hide like live chrome. */
function BottomNavClearanceDemo() {
  const { navHidden } = useNavScroll();
  const style = {
    ["--storefront-nav-clearance" as string]: navHidden ? "0px" : "5.5rem",
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className="relative max-h-[28rem] overflow-hidden rounded-2xl bg-paper ring-1 ring-black/5"
    >
      <div
        data-storefront-scroll
        className="max-h-[28rem] overflow-y-auto overscroll-contain px-4 pt-4 pb-[var(--storefront-nav-clearance,5.5rem)] transition-[padding-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <p className="text-[13px] font-semibold text-forest">Hidden on routes</p>
        <ul className="mt-2 space-y-1 text-[12px] text-muted">
          {STOREFRONT_NAV_HIDDEN_PATHS.map((path) => (
            <li key={path} className="font-mono">
              {path}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] font-semibold text-forest">
          Scroll to hide
        </p>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          Scroll down — pill slides off and bottom padding collapses (no blank
          strip). Focus a tab first to confirm inert (no aria-hidden warning).
        </p>
        {Array.from({ length: 14 }, (_, i) => (
          <p key={i} className="mt-3 text-sm text-ink">
            Scroll block {i + 1}
          </p>
        ))}
      </div>
      <BottomNav position="inline" />
    </div>
  );
}

const BUILT_DEMOS: Record<string, () => ReactNode> = {
  "back-button": () => (
    <DemoFrame note="Green squircle + black arrow — same default as storefront PageHeader / cart / profile.">
      <div className="flex h-16 items-center px-5">
        <BackButton href="/playground" />
      </div>
    </DemoFrame>
  ),
  "close-button": () => (
    <DemoFrame note="Pair to BackButton: green squircle + black X. Used on address / coupon / weight / flyer sheets.">
      <div className="flex h-16 items-center justify-center gap-6 bg-paper px-5">
        <BackButton href="/playground" />
        <CloseButton onClick={() => undefined} />
      </div>
    </DemoFrame>
  ),
  "page-header": () => (
    <DemoFrame note="Sticky header: scroll to hide the title — back stays visible and usable.">
      <div className="relative max-h-[22rem] overflow-y-auto overscroll-contain bg-paper px-5 pb-8">
        <PageHeader backHref="/playground" title="Sample title" />
        <p className="mt-4 text-sm leading-6 text-muted">
          Scroll this panel. The header sticks; the title fades and only the back
          button remains tappable.
        </p>
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} className="mt-4 text-sm text-ink">
            Sample scroll block {i + 1} — keep going to collapse the title.
          </p>
        ))}
      </div>
    </DemoFrame>
  ),
  "bottom-nav": () => (
    <DemoFrame note="Fixed island BottomNav. Clearance collapses on scroll-hide; fill pages overlay the pill (no paper band). inert avoids aria-hidden focus warnings.">
      <NavScrollProvider>
        <BottomNavClearanceDemo />
      </NavScrollProvider>
    </DemoFrame>
  ),
  "pull-to-refresh": () => (
    <DemoFrame note="Passive touch only — never blocks scroll (cart lesson). Demo refresh on desktop; pull at top on device.">
      <PullDemo />
    </DemoFrame>
  ),
  "scroll-to-top": () => (
    <DemoFrame note="Invisible helper — mounts ScrollToTopOnLoad (same as /home).">
      <div className="px-5 py-10 text-sm leading-6 text-muted">
        <ScrollToTopOnLoad />
        <p className="font-semibold text-ink">ScrollToTopOnLoad is mounted.</p>
        <p className="mt-2">
          On /home it sets <code className="text-forest">scrollRestoration = manual</code>{" "}
          and scrolls to (0, 0) so refresh always shows the hero.
        </p>
      </div>
    </DemoFrame>
  ),
  "shop-fallback-avatars": () => (
    <DemoFrame note="Wired ecom: yellow awning (SHOP_IMAGE_FALLBACK). Other candidates kept for swap.">
      <div className="space-y-8 bg-gradient-to-b from-mint via-[#d4efd4] to-paper px-4 py-6">
        <div>
          <p className="mb-3 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Wired ecom fallback
          </p>
          <HomeTopBar
            shopName="Yaadro"
            shopImage="/icons/shop-fallback-awning-yellow.png"
            signedIn={false}
          />
          <div className="mt-4 flex justify-center">
            <Image
              src="/icons/shop-fallback-awning-yellow.png"
              alt=""
              width={96}
              height={96}
              unoptimized
              className="size-24 rounded-full bg-white object-contain p-2 ring-2 ring-white shadow-[0_8px_24px_rgba(47,107,47,0.12)]"
            />
          </div>
          <p className="mt-2 text-center text-[12px] font-medium text-muted">
            /icons/shop-fallback-awning-yellow.png
          </p>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Previous (og-image)
          </p>
          <HomeTopBar
            shopName="Yaadro"
            shopImage={SHOP_IMAGE_FALLBACK_CURRENT}
            signedIn={false}
          />
        </div>

        <div className="space-y-6">
          <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Candidates
          </p>
          {SHOP_FALLBACK_AVATAR_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="rounded-2xl bg-white/70 p-4 ring-1 ring-forest/10"
            >
              <p className="mb-3 text-sm font-bold text-forest">
                {option.label}{" "}
                <span className="font-medium text-muted">({option.id})</span>
              </p>
              <HomeTopBar
                shopName="Green Basket"
                shopImage={option.src}
                signedIn={false}
              />
              <div className="mt-4 flex items-end justify-center gap-4">
                <Image
                  src={option.src}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="size-11 rounded-full bg-white object-contain p-1 ring-2 ring-white shadow"
                />
                <Image
                  src={option.src}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className="size-24 rounded-full bg-white object-contain p-2 ring-2 ring-white shadow-[0_8px_24px_rgba(47,107,47,0.12)]"
                />
              </div>
              <p className="mt-2 text-center text-[12px] font-medium text-muted">
                {option.src}
              </p>
            </div>
          ))}
        </div>
      </div>
    </DemoFrame>
  ),
  "deferred-location": () => (
    <DemoFrame note="Wired `/home`: soft map prompt locks body while open. Back from /categories force-clears overflow (pathname fill chrome + delayed unlock) so home vertical scroll is never stuck. Confirm pin runs radius preview.">
      <div className="relative min-h-[28rem] bg-gradient-to-b from-mint to-paper px-4 pt-6 pb-10">
        <HomeTopBar
          shopName="Green Basket"
          shopImage="/icons/shop-fallback-awning-yellow.png"
          signedIn={false}
        />
        <p className="mt-8 text-center text-sm font-medium text-muted">
          Sheet opens after settle — Detect / Use this location saves the pin,
          checks delivery radius, then closes. Details still wait for checkout.
        </p>
        <DeferredLocationPrompt forcePreview delayMs={900} />
      </div>
    </DemoFrame>
  ),
  "pwa-install-prompt": () => (
    <DemoFrame note="Live: only on `/home`. Dismiss / appinstalled force-clears scroll; shell reconciles on focus/visibility/pointer and after route changes (categories → home).">
      <div className="relative min-h-[28rem] bg-gradient-to-b from-mint to-paper px-4 pt-6 pb-10">
        <HomeTopBar
          shopName="Green Basket"
          shopImage="/icons/shop-fallback-awning-yellow.png"
          signedIn={false}
        />
        <p className="mt-8 text-center text-sm font-medium text-muted">
          Install sheet appears at the bottom (session dismiss).
        </p>
        <Suspense fallback={null}>
          <InstallPrompt forcePreview />
        </Suspense>
      </div>
    </DemoFrame>
  ),

  "help-support": () => (
    <DemoFrame note="Wired ecom `/profile/support`. Contact us + Details expand (phone/address). Sample contact here; optional NEXT_PUBLIC_SHOP_SUPPORT_* on ecom.">
      <div className="max-h-[85vh] overflow-y-auto overscroll-contain">
        <HelpSupportContent
          contact={SAMPLE_SHOP_SUPPORT}
          backHref="/playground"
          topicHrefFor={(href) =>
            href === "/orders"
              ? "/playground/orders-list"
              : href === "/coupons"
                ? "/playground/coupons-list"
                : "/playground/address-book"
          }
        />
      </div>
    </DemoFrame>
  ),
  "home-top-bar": () => (
    <DemoFrame note="Guest / signed-in account slot. Outside delivery radius paints Deliver to red after the home pin fails the shop radius preview (same DB check as checkout).">
      <div className="space-y-6 bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-6">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Guest
          </p>
          <HomeTopBar
            shopName="Yaadro"
            shopImage="/onboarding/brand-mark-white-y.svg"
            signedIn={false}
            previewAddressLabel="Choose your location"
          />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Signed in
          </p>
          <HomeTopBar
            shopName="Yaadro"
            shopImage="/onboarding/brand-mark-white-y.svg"
            signedIn
            previewAddressLabel="Indiranagar, Bengaluru"
          />
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Outside delivery radius
          </p>
          <HomeTopBar
            shopName="Yaadro"
            shopImage="/onboarding/brand-mark-white-y.svg"
            signedIn={false}
            previewOutsideRadius
          />
        </div>
      </div>
    </DemoFrame>
  ),
  "category-rail": () => (
    <DemoFrame
      surface="bare"
      note="Same as /home: Style 2 pills on paper (no DemoFrame card shell). All first; scroll + tap select unchanged."
    >
      <HomeCategoryProvider>
        <div className="pt-6 pb-4">
          <CategoryRail
            tileVariant="pill"
            imageFallback={CATEGORY_IMAGE_FALLBACK}
            categories={[
              ...HOME_CATEGORIES.map((category) => ({
                name: category.name,
                slug: category.name,
                image: category.image,
              })),
              { name: "No photo", slug: "No photo", image: "" },
            ]}
          />
        </div>
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "offer-banners": () => (
    <DemoFrame note="Live /home: full-bleed creative only (no Offer!! / Shop now overlay). Sample below keeps title + CTA for playground.">
      <div className="space-y-8 py-4">
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold tracking-wide text-muted uppercase">
            Live style (image only)
          </p>
          <OfferBanners
            banners={[
              {
                id: "live-festive",
                title: "Festive market",
                subtitle: "",
                image: "/home/festive-section.jpg",
                href: "/categories",
              },
              {
                id: "live-produce",
                title: "Fresh produce",
                subtitle: "",
                image: "/home/fruits-veggies-section.jpg",
                href: "/categories/fruits",
              },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold tracking-wide text-muted uppercase">
            Sample (title + Shop now)
          </p>
          <OfferBanners allowSample />
        </div>
      </div>
    </DemoFrame>
  ),
  search: () => (
    <DemoFrame note="Same as live /home: gateway (no typing), rotating samples; tap → /categories?focus=search. Filter → chips open (&chips=1).">
      <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-8">
        <HomeTopBar
          shopName="Yaadro"
          shopImage="/onboarding/brand-mark-white-y.svg"
        />
        <HomeSearchBar
          className="mt-4"
          navigateOnSubmit={false}
          activateHref="/categories?focus=search"
          filterHref="/categories?focus=search&chips=1"
          placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
          placeholderMotion="typewriter"
        />
        <div className="mt-4 -mx-5">
          <OfferBanners allowSample />
        </div>
      </div>
    </DemoFrame>
  ),
  "search-placeholder-motion": () => (
    <DemoFrame note="Compare gateway placeholder motions. Pick one, then wire placeholderMotion on live /home. Tap any bar → /categories?focus=search.">
      <div className="space-y-5 bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 py-6">
        {SEARCH_PLACEHOLDER_MOTION_OPTIONS.map((option) => (
          <div key={option.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-bold text-forest">{option.label}</p>
              <code className="text-[10px] font-semibold text-forest/60">
                {option.id}
              </code>
            </div>
            <p className="mb-2 text-[11px] leading-4 text-forest/70">
              {option.blurb}
            </p>
            <HomeSearchBar
              activateHref="/categories?focus=search"
              filterHref="/categories?focus=search&chips=1"
              placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
              placeholderMotion={option.id}
              placeholderIntervalMs={
                option.id === "typewriter" ? 1400 : 2600
              }
            />
          </div>
        ))}
      </div>
    </DemoFrame>
  ),
  "offer-flyer": () => (
    <DemoFrame note="Flyer respects once-per-day localStorage; clear yaadro-flyer:* to re-show.">
      <div className="relative min-h-[200px] px-5 py-10 text-center text-sm text-muted">
        Flyer mounts on delay when eligible.
        <OfferFlyer />
      </div>
    </DemoFrame>
  ),
  "product-section": () => {
    const wideAisle = [
      ...getProductsByCategory("Vegetables"),
      ...getProductsByCategory("Fruits")
        .slice(0, 2)
        .map((product) => ({ ...product, id: `wide-${product.id}` })),
    ];
    return (
      <DemoFrame note="Same as /home: denser 3:2 cards in ~152px slots; rails keep px-5 gutter. ≤10 → one row; >10 → two rows.">
        <HomeCategoryProvider>
          <ProductSection />
        </HomeCategoryProvider>
        <HomeCategoryProvider initialSlug="wide">
          <div className="pb-4">
            <ProductSection
              productsBySlug={{ wide: wideAisle }}
              categoryNames={{ wide: "More than 10" }}
            />
            <WeightCustomizer />
          </div>
        </HomeCategoryProvider>
      </DemoFrame>
    );
  },
  "fruits-veggies-section": () => (
    <DemoFrame
      surface="bare"
      note="Same as /home: Browse all → /categories/fruits or /vegetables (PLP sidebar tiles match category browser)."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-black/5">
        <FruitsVeggiesSection />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "daily-dairy-layouts": () => (
    <DemoFrame
      surface="bare"
      note="A vs C compare (both kept). Live /home uses layout A. See all → playground page here; ecom → /dairy."
    >
      <div className="relative max-h-[85vh] space-y-10 overflow-y-auto overscroll-contain bg-paper py-4 ring-1 ring-black/5">
        <DailyDairyLayoutLabel
          letter="A"
          name="On art"
          blurb="Natural art frame · black title on real yellow top · veggies chips · See all at bottom."
        >
          <DailyDairySection
            layout="on-art"
            priority
            shelf={SAMPLE_DAIRY_SHELF}
            browseHref="/playground/daily-dairy-page"
          />
        </DailyDairyLayoutLabel>
        <DailyDairyLayoutLabel
          letter="C"
          name="Fade bottom"
          blurb="Same art frame · soft black fade from bottom for cards · same chips + See all."
        >
          <DailyDairySection
            layout="split"
            shelf={SAMPLE_DAIRY_SHELF}
            browseHref="/playground/daily-dairy-page"
          />
        </DailyDairyLayoutLabel>
        <DailyDairyLayoutLabel
          letter="A"
          name="No category rail"
          blurb="Layout A when admin adds no child categories — products + See all only."
        >
          <DailyDairySection
            layout="on-art"
            shelf={SAMPLE_DAIRY_SHELF_PRODUCTS_ONLY}
            browseHref="/playground/daily-dairy-page"
          />
        </DailyDairyLayoutLabel>
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "daily-dairy-section": () => (
    <DemoFrame
      surface="bare"
      note="Layout A — same as live /home when a dairy shelf matches. Compare A vs C: /playground/daily-dairy-layouts. Live See all → /dairy."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
        <DailyDairySection
          layout="on-art"
          priority
          browseHref="/playground/daily-dairy-page"
        />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "daily-dairy-page": () => (
    <DemoFrame
      surface="bare"
      note="See-all: sticky clear dairy BG (no blur) + product grid. Live: /dairy."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-black/5">
        <DailyDairyPageContent backHref="/playground/daily-dairy-layouts" />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "festive-offers-section": () => (
    <DemoFrame
      surface="bare"
      note="Full festive image card — headline = admin shelf title (sample: Diwali festive specials). Live: /home → /festive."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
        <FestiveOffersSection
          priority
          seeAllHref="/playground/festive-offers-page"
        />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "festive-offers-page": () => (
    <DemoFrame
      surface="bare"
      note="See-all: sticky blurred festive BG + product grid. Live: /festive."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-black/5">
        <FestiveOffersPageContent backHref="/playground/festive-offers-section" />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "category-browse-sections": () => (
    <DemoFrame
      surface="bare"
      note="Phase B #30 aisle grids — same max-w-lg column as /home (not full-bleed on monitor). Prefer home-more-sections for the full stack."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper ring-1 ring-black/5">
        <FruitsVeggiesSection />
        <CategoryBrowseSections
          layout="rect-first"
          className="bg-paper [&_h2]:text-ink"
        />
      </div>
    </DemoFrame>
  ),
  "category-card-shared": () => (
    <DemoFrame
      surface="bare"
      note="Phase B #28 wired: CategoryCard on live rail, hub, browser, listing. Demo remains the shared API reference."
    >
      <PhaseBCategoryCardDemo />
    </DemoFrame>
  ),
  "storefront-shell": () => (
    <DemoFrame
      surface="bare"
      note="Phase B #29: scroll-hide collapses bottom clearance with the pill (same as live StorefrontChrome — no blank strip)."
    >
      <PhaseBShellDemo />
    </DemoFrame>
  ),
  "home-more-sections": () => (
    <DemoFrame
      surface="bare"
      note="Live /home: one browse page for All + bucketed rails; soft PLP-fill only for empty roots (capped). Timeouts surface as catalog error for every shop — not a fake empty aisle. /api/warm → loadHomeCatalog."
    >
      <PhaseBHomeSectionsDemo />
    </DemoFrame>
  ),
  "type-scale": () => <TypeScaleSpecimen />,
  "home-product-shelves": () => (
    <DemoFrame
      surface="bare"
      note="Spec type scale (playground only): Featured / Most ordered / Favourites — larger headings + spacing."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper">
        <HomeProductShelves />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "home-pull-content": () => (
    <DemoFrame note="Same as /home body. Live All comes from one browse page; rails from bucket + soft PLP fill; catalogError when load fails.">
      <HomeCategoryProvider>
        <HomePullContent />
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "home-section-sort": () => <HomeSectionSortDemo />,
  "brand-footer": () => (
    <DemoFrame note="Muted D + yaadro wordmark — same as /home and /profile scroll end.">
      <div className="bg-paper px-5">
        <BrandFooter />
      </div>
    </DemoFrame>
  ),
  "product-card": () => (
    <DemoFrame note="Shared ProductCard (live + playground). % OFF ribbon clipped clean — no white fringe on the curve. Compact = denser rail size.">
      <div className="space-y-6 bg-paper p-4">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Default
          </p>
          <div className="grid grid-cols-2 gap-4">
            {SAMPLE_PRODUCTS.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            <ProductCard product={NO_PHOTO_PRODUCT} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Compact
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SAMPLE_PRODUCTS.slice(0, 4).map((p) => (
              <div
                key={`compact-${p.id}`}
                className="w-[9.375rem] shrink-0"
              >
                <ProductCard product={p} size="compact" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <WeightCustomizer />
    </DemoFrame>
  ),
  "view-cart-bar": () => (
    <DemoFrame note="Ecom: FAB path-hides with BottomNav (cart, checkout, order detail/track, profile tasks). This frame forces inline so you can still preview scroll + drop.">
      <div className="relative h-[28rem] overflow-hidden rounded-2xl bg-paper ring-1 ring-black/5">
        <div className="h-full overflow-y-auto overscroll-contain px-5 pt-4 pb-28 text-sm text-muted">
          <p className="font-semibold text-forest">View cart + nav</p>
          <p className="mt-1">
            Add items first. Scroll — nav hides, cart drops after ~320ms.
            Live storefront hides this FAB on order details / track.
          </p>
          {Array.from({ length: 18 }, (_, i) => (
            <p key={i} className="mt-3 text-ink">
              Scroll block {i + 1}
            </p>
          ))}
        </div>
        <ViewCartBar position="inline" />
        <BottomNav position="inline" />
      </div>
    </DemoFrame>
  ),
  "weight-customizer": () => (
    <DemoFrame note="Add opens weight sheet (Orange 0.1 kg step). Same WeightCustomizer as ecom.">
      <WeightCustomizerDemo />
    </DemoFrame>
  ),
  "empty-cart": () => (
    <DemoFrame note="Same empty layout as /cart — vertically centered like wishlist.">
      <div className="relative h-[75vh] overflow-hidden bg-paper">
        <div className="mx-auto flex h-full w-full max-w-lg flex-col px-5">
          <PageHeader backHref="/playground" title="Cart" />
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-16 text-center">
            <Image
              src="/cart/empty-cart-smooth.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-52 max-w-full"
            />
            <h2 className="mt-5 text-xl font-extrabold text-ink">Your cart is empty</h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              Add something fresh from the store to see it here.
            </p>
            <Link
              href="/home"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright"
            >
              Shop now
            </Link>
          </div>
        </div>
      </div>
    </DemoFrame>
  ),
  "empty-wishlist": () => (
    <DemoFrame note="Signed-in empty — same art as storefront empty state.">
      <WishlistProvider previewSignedIn initialIds={[]}>
        <div className="relative max-h-[70vh] overflow-y-auto overscroll-contain">
          <WishlistPageContent chromePosition="inline" />
        </div>
      </WishlistProvider>
    </DemoFrame>
  ),
  "wishlist-list": () => (
    <DemoFrame note="Same as /wishlist when signed in (seeded). Heart removes from list.">
      <WishlistProvider previewSignedIn initialIds={WISHLIST_SEED_IDS}>
        <div className="relative h-[75vh] overflow-y-auto overscroll-contain">
          <WishlistPageContent chromePosition="inline" />
        </div>
        <WeightCustomizer />
      </WishlistProvider>
    </DemoFrame>
  ),
  "wishlist-guest-heart": () => (
    <DemoFrame note="Playground guest provider — heart → /login. Storefront hearts save locally.">
      <div className="mx-auto max-w-xs p-4">
        <ProductCard product={SAMPLE_PRODUCTS[0]} />
      </div>
    </DemoFrame>
  ),
  "cart-page": () => (
    <DemoFrame
      surface="bare"
      note="Phase A wired: #32 solid Checkout CTA + #36 stable line order (also on live /cart). SAMPLE top offers + local apply."
    >
      <div className="relative h-[75vh] bg-paper">
        <CartPageContent
          chromePosition="inline"
          couponPickerHref="/playground/coupons-apply"
          showPriceMayVary
          showCartSuggestions
          previewSignedIn
          sampleCoupons
        />
      </div>
      <WeightCustomizer />
    </DemoFrame>
  ),
  checkout: () => (
    <DemoFrame
      surface="bare"
      note="Scroll clears sticky Place Order — “You saved” sits above the footer. Guest → login."
    >
      <div className="relative h-[75vh] overflow-hidden bg-paper">
        <CheckoutPageContent
          chromePosition="inline"
          showPriceMayVary
          previewSignedIn={false}
        />
      </div>
    </DemoFrame>
  ),
  "checkout-coupon": () => (
    <DemoFrame
      surface="bare"
      note="Coupon −₹ fixture. Scroll padding clears sticky footer so savings strip is fully visible."
    >
      <div className="relative h-[75vh] overflow-hidden bg-paper">
        <CheckoutPageContent
          chromePosition="inline"
          showPriceMayVary
          previewSignedIn
          demoBill={{
            subtotalRupees: 599,
            couponCode: "FRESH10",
            couponDiscountRupees: 50,
            saveRupees: 120,
            totalRupees: 479,
          }}
        />
      </div>
    </DemoFrame>
  ),
  "order-placed": () => (
    <DemoFrame
      surface="bare"
      note="Same OrderPlacedContent mascot + bill as live Place Order success."
    >
      <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-paper ring-1 ring-forest/10">
        <OrderPlacedContent
          summary={SAMPLE_ORDER_PLACED}
          ordersHref="/playground/orders-list"
          homeHref="/playground"
        />
      </div>
    </DemoFrame>
  ),
  "address-modal-shared": () => (
    <DemoFrame
      surface="bare"
      note="Phase C #31+#35 wired: profile Address sheet + checkout/home Edit with editId. Demo stays the shared-modal reference."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper ring-1 ring-black/5">
        <PhaseCAddressModalDemo />
      </div>
    </DemoFrame>
  ),
  "address-book": () => <AddressBookDemo initialStep="list" />,
  "address-manage": () => (
    <DemoFrame note="Same as /profile/addresses: one delivery address. Edit or delete it. Add only when none is saved.">
      <div className="bg-paper px-5 py-6">
        <h2 className="text-xl font-extrabold text-black">Address</h2>
        <p className="mt-1 text-[13px] text-muted">
          One delivery address for home and checkout.
        </p>
        <SavedAddressesManageList className="mt-5" />
      </div>
    </DemoFrame>
  ),
  "address-map": () => (
    <div className="space-y-4">
      <DeliveryRadiusMapDemo />
      <AddressBookDemo
        initialStep="map"
        note="Live sheet: AddressLocationMap loads this shop’s DB hub (S pin) + DB radius only — no env fallback."
      />
    </div>
  ),
  "address-details": () => (
    <AddressBookDemo
      initialStep="map"
      note="Location details: place suggestions + Detect card (no locate in search). Close (X) only."
    />
  ),
  "categories-hub": () => <CategoriesFlowDemo start="hub" />,
  "category-grid": () => <CategoriesFlowDemo start="hub" />,
  "category-plp": () => <CategoriesFlowDemo start="plp" />,
  "category-plp-horizontal": () => (
    <DemoFrame
      surface="bare"
      note="Live /categories/[slug]: sticky pill rail with soft paper wash (no border card) so products don’t bleed through. BottomNav floats over content."
    >
      <NavScrollProvider>
        <CategoryPlpHorizontalDemo />
      </NavScrollProvider>
    </DemoFrame>
  ),
  "home-search-categories": () => <CategoriesFlowDemo start="home-search" />,
  "category-browser": () => {
    const branches: CategoryBranch[] = HOME_CATEGORIES.map((category) => ({
      id: category.name,
      name: category.name,
      slug: category.name.toLowerCase().replace(/\s+/g, "-"),
      image: category.image,
      children: [],
    }));
    // Enough rows to scroll the product column (nav hide needs nested scroll).
    const products = [...SAMPLE_PRODUCTS, ...SAMPLE_PRODUCTS].map(
      (product, index) => {
        const branch = branches[index % branches.length]!;
        return {
          ...product,
          id: `${product.id}-pg-${index}`,
          categorySlug: branch.slug,
        };
      },
    );
    return (
      <DemoFrame
        note="Legacy sidebar. Live /categories: sticky pill rail with soft wash (no bordered card) + floating BottomNav."
      >
        <div className="relative flex h-[36rem] flex-col overflow-hidden rounded-2xl bg-paper ring-1 ring-black/5">
          <div className="px-5 pt-3">
            <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Categories
            </p>
          </div>
          <CategoryBrowser
            branches={branches}
            products={products}
            railLayout="sidebar"
          />
          <BottomNav position="inline" />
        </div>
      </DemoFrame>
    );
  },
  "orders-list": () => (
    <DemoFrame note="Same as /orders: parcel + order id, status badge + pulse.">
      <div className="relative max-h-[75vh] overflow-y-auto overscroll-contain bg-paper">
        <OrdersPageContent
          chromePosition="inline"
          backHref="/playground"
          shopHref="/playground"
          ticketBill
          highlightStatus
          showOrderId
          detailHref={(id) => `/playground/order-detail?id=${id}`}
        />
      </div>
    </DemoFrame>
  ),
  "order-detail": () => (
    <Suspense fallback={null}>
      <OrderDetailLeadDemo />
    </Suspense>
  ),
  "order-bill-coupon": () => (
    <DemoFrame
      surface="bare"
      note="Fix: Coupon (CODE) uses coupon_discount_minor — not Math.max with inflated promotion_discount_total. Live /orders/[id] bill uses the same mapper."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper ring-1 ring-black/5">
        <OrderBillCouponFixDemo />
      </div>
    </DemoFrame>
  ),
  "live-order-track": () => (
    <DemoFrame
      surface="bare"
      note="Accepted/Packed: waiting for partner. OFD + rider: Live Track. Live /orders/[id]/track loads API orders the same way."
    >
      <LiveOrderTrackDemo />
    </DemoFrame>
  ),
  "empty-orders": () => (
    <DemoFrame note="Signed-in empty: empty-orders-v2 mascot (Order History window) + Shop now. Same as /orders when logged in with no history.">
      <div className="relative max-h-[70vh] overflow-y-auto overscroll-contain bg-paper">
        <OrdersPageContent
          orders={[]}
          previewSignedIn
          chromePosition="inline"
          backHref="/playground"
          shopHref="/playground"
        />
      </div>
    </DemoFrame>
  ),
  "orders-guest": () => (
    <DemoFrame note="Guest gate: empty-orders-v2 mascot + Sign in button → /login?next=/orders. Same as /orders when logged out.">
      <div className="relative max-h-[70vh] overflow-y-auto overscroll-contain bg-paper">
        <OrdersPageContent
          previewSignedIn={false}
          chromePosition="inline"
          backHref="/playground"
          shopHref="/playground"
        />
      </div>
    </DemoFrame>
  ),
  "product-detail": () => <ProductDetailDemo />,
  "price-may-vary": () => (
    <DemoFrame
      note="Soft = live cart/checkout/PDP. Banner kept for comparison. See price-vary-explain for #33 ?"
    >
      <div className="space-y-8 bg-paper px-5 py-6">
        <section>
          <h3 className="text-center text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Notice · banner (ecom today)
          </h3>
          <PriceMayVaryNotice className="mt-2" variant="banner" />
        </section>
        <section>
          <h3 className="text-center text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Notice · soft (playground cart / checkout / PDP)
          </h3>
          <PriceMayVaryNotice className="mt-2" variant="soft" />
        </section>
      </div>
    </DemoFrame>
  ),
  "price-vary-explain": () => (
    <DemoFrame
      surface="bare"
      note="Phase D #33 wired on live /cart: notice display-only; Checkout → popup → Continue → checkout. Demo mirrors the flow."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper ring-1 ring-black/5">
        <PhaseDPriceVaryExplainDemo />
      </div>
    </DemoFrame>
  ),
  "onboarding-screen": () => (
    <DemoFrame note="Full welcome screen (tall). Swipe / continue navigate as in production.">
      <div className="max-h-[70vh] overflow-y-auto">
        <OnboardingScreen />
      </div>
    </DemoFrame>
  ),
  "green-corners": () => (
    <DemoFrame>
      <div className="relative h-64 overflow-hidden bg-paper">
        <GreenCornerAccents intensity="soft" />
        <p className="relative z-10 px-5 py-10 text-center text-sm font-semibold text-forest">
          Soft green corner accents
        </p>
      </div>
    </DemoFrame>
  ),
  "swipe-to-login": () => (
    <DemoFrame note="Solid brand green fills behind the handle as you drag (storefront theme tokens).">
      <div className="px-5 py-10">
        <SwipeToLogin onComplete={() => undefined} />
      </div>
    </DemoFrame>
  ),
  "phone-otp": () => (
    <DemoFrame note="UI stub — no auth API.">
      <MiniPhoneOtp />
    </DemoFrame>
  ),
  "login-form": () => (
    <DemoFrame note="Swipe → Welcome immediately (Confirming…); API then Taking you home… → /home.">
      <div className="px-4 py-6">
        <ShopNameProvider name="Green Basket">
          <LoginForm shopName="Green Basket" />
        </ShopNameProvider>
      </div>
    </DemoFrame>
  ),
  "verified-success": () => (
    <DemoFrame note="Confirming = spinner (no tick). Success = check + Welcome to {shop}. LoginForm switches on sessionReady.">
      <div className="space-y-10 px-4 py-4">
        <div>
          <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Confirming
          </p>
          <VerifiedSuccess shopName="Green Basket" status="confirming" />
        </div>
        <div>
          <p className="mb-2 text-center text-[11px] font-bold tracking-wide text-forest/70 uppercase">
            Success
          </p>
          <VerifiedSuccess shopName="Green Basket" status="success" />
        </div>
      </div>
    </DemoFrame>
  ),
  "coming-soon": () => (
    <DemoFrame note="Shared stub used by orders, addresses, settings, etc.">
      <ComingSoonPage
        title="Sample stub"
        description="This is the ComingSoonPage shell used across unfinished storefront routes."
        backHref="/playground"
      />
    </DemoFrame>
  ),
  "not-found": () => (
    <DemoFrame
      surface="bare"
      note="Same as global app/not-found — Page not found + Refresh."
    >
      <div className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-[1.75rem] ring-1 ring-forest/10">
        <NotFoundContent className="min-h-[32rem]" />
      </div>
    </DemoFrame>
  ),
  skeletons: () => (
    <DemoFrame
      surface="bare"
      note="Same as storefront Suspense. Home hero uses bones (no Yaadro name flash) while getShopSeo resolves."
    >
      <div className="max-h-[85vh] space-y-10 overflow-y-auto overscroll-contain bg-paper px-4 py-6">
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Home hero (shop resolve)
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <HomeHeroSkeleton />
          </div>
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Product card
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Product grid
          </p>
          <ProductGridSkeleton count={4} />
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Product rail
          </p>
          <ProductRailSkeleton count={3} />
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Home shelf
          </p>
          <HomeShelfSkeleton className="!px-0" />
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Categories hub
          </p>
          <CategoriesHubSkeleton className="!px-0" />
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Category PLP
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <CategoryPlpSkeleton />
          </div>
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Product detail
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <ProductDetailSkeleton />
          </div>
        </section>
        <section>
          <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            Storefront page shell
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <StorefrontPageSkeleton className="min-h-0 pt-6 pb-6" />
          </div>
        </section>
      </div>
    </DemoFrame>
  ),
  "coupons-list": () => (
    <DemoFrame note="Same as /coupons: simplified ticket body (discount → title → code/until). Stub label without dashed box.">
      <div className="max-h-[75vh] overflow-y-auto overscroll-contain">
        <CouponsPageContent backHref="/playground" />
      </div>
    </DemoFrame>
  ),
  "coupons-apply": () => (
    <DemoFrame note="Same as /coupons?from=cart. Tap active → Apply → cart-page. Used/Expired cannot apply.">
      <div className="max-h-[75vh] overflow-y-auto overscroll-contain">
        <CouponsPageContent
          backHref="/playground/cart-page"
          applyReturnHref="/playground/cart-page"
        />
      </div>
    </DemoFrame>
  ),
  "coupons-empty": () => (
    <DemoFrame note="Signed-in empty: empty-coupons mascot + No coupons yet. Same as /coupons when logged in with no offers.">
      <CouponsPageContent
        backHref="/playground"
        coupons={[]}
        previewSignedIn
      />
    </DemoFrame>
  ),
  "coupons-guest": () => (
    <DemoFrame note="Guest gate: empty-coupons mascot + Sign in button → /login?next=/coupons. Same as /coupons when logged out.">
      <CouponsPageContent backHref="/playground" previewSignedIn={false} />
    </DemoFrame>
  ),
  toasts: () => (
    <DemoFrame
      surface="bare"
      note="Theme island snackbars at the top. showPopup(message, type) — same API as storefront. Auto-dismiss ~3.2s."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-black/5">
        <ToastDemo />
      </div>
    </DemoFrame>
  ),
  "multi-phone-layout": () => {
    const cards = SAMPLE_PRODUCTS.slice(0, 4);
    return (
      <DemoFrame note="MULTI_PHONE_LAYOUT_PLAN — SE-height profile must scroll. Narrow card photo uses aspect 5/4.">
        <div className="space-y-8 bg-paper px-4 py-5">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Profile · iPhone SE height (~667px) — scroll to footer
            </p>
            <div className="relative mt-2 h-[667px] overflow-y-auto overflow-x-hidden rounded-2xl ring-1 ring-forest/15">
              <ProfileScreen
                preview={{ signedIn: false }}
                backHref="/playground"
                hideHeader={false}
                className="min-h-0"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Product cards · narrow (~375px) density
            </p>
            <div className="mx-auto mt-2 w-[375px] max-w-full rounded-2xl bg-paper p-3 ring-1 ring-forest/15">
              <div className="grid grid-cols-2 gap-3">
                {cards.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DemoFrame>
    );
  },
  "profile-options-refine": () => (
    <DemoFrame note="Wired to ecom /profile — same ProfileOptionsList (guest Sign in pill on orders/coupons).">
      <ProfileOptionsRefineDemo />
    </DemoFrame>
  ),
  "profile-header": () => {
    const signedInProfile: CustomerProfile = {
      user: {
        id: "playground-demo-user",
        name: "Priya Nair",
        phone: "9876543210",
      },
      customer: { id: "cust-1", displayName: null },
      address: null,
    };
    return (
      <DemoFrame note="Live ProfileScreen — desk hero, options list, larger Logout. Confirm is dry-run in playground.">
        <div className="max-h-[40rem] space-y-8 overflow-y-auto overscroll-contain bg-paper pb-6">
          <div>
            <p className="px-5 pt-3 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Guest
            </p>
            <ProfileScreen
              preview={{ signedIn: false }}
              backHref="/playground"
              dryRun
            />
          </div>
          <div>
            <p className="px-5 pt-1 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Signed in
            </p>
            <ProfileScreen
              preview={{ signedIn: true, profile: signedInProfile }}
              backHref="/playground"
              dryRun
            />
          </div>
          <div>
            <p className="px-5 pt-1 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Error
            </p>
            <ProfileScreen
              preview={{ signedIn: true, status: "error" }}
              backHref="/playground"
              dryRun
            />
          </div>
          <div>
            <p className="px-5 pt-1 text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Offline (cached name)
            </p>
            <ProfileScreen
              preview={{
                signedIn: true,
                status: "offline",
                profile: signedInProfile,
              }}
              backHref="/playground"
              dryRun
            />
          </div>
          <div className="px-5">
            <p className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
              Avatar seeds
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {["user-a", "user-b", "user-c", "user-d", "user-e", "user-f"].map(
                (seed) => (
                  <li key={seed} className="flex flex-col items-center gap-1">
                    <Image
                      src={pickDefaultProfileAvatar(seed)}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className="size-14 object-cover"
                    />
                    <span className="font-mono text-[10px] text-muted">{seed}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </DemoFrame>
    );
  },
};

export function PlaygroundDemo({ slug }: { slug: string }) {
  const entry = getPlaygroundEntry(slug);
  if (!entry) return null;

  if (entry.status === "planned") {
    return (
      <DemoFrame>
        <PlannedStub
          title={entry.title}
          description={entry.description}
          wiresTo={entry.wiresTo}
        />
      </DemoFrame>
    );
  }

  const render = BUILT_DEMOS[slug];
  if (!render) {
    return (
      <DemoFrame>
        <PlannedStub
          title={entry.title}
          description="Marked built in the catalog but no demo renderer yet — add one in demos.tsx."
          wiresTo={entry.wiresTo}
        />
      </DemoFrame>
    );
  }

  return <>{render()}</>;
}
