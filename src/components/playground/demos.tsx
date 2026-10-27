"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/navigation/BackButton";
import { CloseButton } from "@/components/navigation/CloseButton";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  PullToRefresh,
  type PullToRefreshHandle,
} from "@/components/navigation/PullToRefresh";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { CategoryRail } from "@/components/home/CategoryRail";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { ProductSection } from "@/components/home/ProductSection";
import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { HomeProductShelves } from "@/components/home/HomeProductShelves";
import { HomePullContent } from "@/components/home/HomePullContent";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { CategoriesHub } from "@/components/categories/CategoriesHub";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { useCart } from "@/components/cart/CartContext";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";
import { getDefaultCatalogSlug } from "@/lib/catalog-taxonomy";
import { OrdersPageContent } from "@/components/orders/OrdersPageContent";
import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";
import { SwipeToLogin } from "@/components/onboarding/SwipeToLogin";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { GreenCornerAccents } from "@/components/onboarding/GreenCornerAccents";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";
import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { PhoneInput } from "@/features/auth/PhoneInput";
import { OtpInput } from "@/features/auth/OtpInput";
import { LoginForm } from "@/features/auth/LoginForm";
import { VerifiedSuccess } from "@/features/auth/VerifiedSuccess";
import {
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";
import { getPlaygroundEntry } from "@/lib/playground/catalog";
import { DemoFrame } from "./DemoFrame";
import { PlannedStub } from "./PlannedStub";

const WISHLIST_SEED_IDS = ["fr-1", "vg-1", "sn-1", "bv-1"];

const PDP_SAMPLES = SAMPLE_PRODUCTS.filter(
  (p) => p.id === "vg-3" || p.id === "fr-4" || p.id === "sn-3" || p.id === "fr-1",
);

function ProductDetailDemo() {
  const [product, setProduct] = useState<SampleProduct>(
    () => PDP_SAMPLES[0] ?? SAMPLE_PRODUCTS[0],
  );

  return (
    <DemoFrame note="Swipe the gallery; related cards match home ProductCard. After weight/add, CTA shows kg and the cart shortcut appears.">
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

function WeightCustomizerDemo() {
  const { setCustomizing } = useCart();
  const sample = SAMPLE_PRODUCTS.find((p) => p.customization)?.id;
  const product = SAMPLE_PRODUCTS.find((p) => p.id === sample) ?? SAMPLE_PRODUCTS[0];

  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm text-muted">
        Opens the same ruler sheet used on the storefront.
      </p>
      <button
        type="button"
        onClick={() => setCustomizing(product)}
        className="mt-4 inline-flex h-11 items-center rounded-full bg-track px-5 text-sm font-semibold text-black transition hover:bg-leaf-bright"
      >
        Open weight customizer
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
            desktop, or pull down on a touch device at scroll top.
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
      <DemoFrame note="Same as /home: tap search → /categories?focus=search (demo stays in playground).">
        <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-6 pb-10">
          <p className="text-[13px] font-bold text-forest">Home (demo)</p>
          <HomeSearchBar
            className="mt-4"
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
        note="PLP: PageHeader-style title (no location), Filter/Brands/Type, left rail, 2-col grid."
      >
        <div className="relative h-[78vh] overflow-hidden rounded-2xl bg-[#f7f8f7] ring-1 ring-black/5">
          <CategoryListing
            slug={slug}
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
    <DemoFrame note="Fresh: first tile rectangle, rest squares. Drinks: first square, then rectangle. Tap → PLP.">
      <div className="relative max-h-[78vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
        <CategoriesHub
          focusSearch={focusSearch}
          onSelectCategory={(cat) => {
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
        "Saved list (green selected + star default) → Add → stub map + Detect → details. No live Maps API."
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
    <DemoFrame note="Green active pill; Home icon + label black. Inactive icons black. Same BottomNav as storefront.">
      <div className="relative h-[140px] bg-paper">
        <BottomNav position="inline" />
      </div>
    </DemoFrame>
  ),
  "pull-to-refresh": () => (
    <DemoFrame note="Demo refresh works on desktop; touch pull still works on device.">
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
  "home-top-bar": () => (
    <DemoFrame note="Shop avatar + Deliver to + Sign in on mint hero (same as /home).">
      <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-6">
        <HomeTopBar
          shopName="Yaadro"
          shopImage="/onboarding/brand-mark-white-y.svg"
        />
      </div>
    </DemoFrame>
  ),
  "category-rail": () => (
    <DemoFrame>
      <HomeCategoryProvider>
        <div className="pt-6 pb-4">
          <CategoryRail />
        </div>
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "offer-banners": () => (
    <DemoFrame note="Same OfferBanners as /home (under search).">
      <div className="py-4">
        <OfferBanners />
      </div>
    </DemoFrame>
  ),
  search: () => (
    <DemoFrame note="Pill search + green filter chip (Yaadro theme). Same as /home above banners. Submit/filter UI-only.">
      <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-8">
        <HomeTopBar
          shopName="Yaadro"
          shopImage="/onboarding/brand-mark-white-y.svg"
        />
        <HomeSearchBar className="mt-4" navigateOnSubmit={false} />
        <div className="mt-4 -mx-5">
          <OfferBanners />
        </div>
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
  "product-section": () => (
    <DemoFrame note="Same as /home: max 10 · two independent rows · ~172px slots. Show all → /categories/[slug] for the selected rail.">
      <HomeCategoryProvider>
        <div className="pb-4">
          <ProductSection />
          <WeightCustomizer />
        </div>
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "fruits-veggies-section": () => (
    <DemoFrame
      surface="bare"
      note="Same as /home produce band: dark scrims, All/Fruits/Vegetables (10); Browse all → /categories."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-black/5">
        <FruitsVeggiesSection />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "home-product-shelves": () => (
    <DemoFrame
      surface="bare"
      note="Same shelves as /home under produce: Featured / Most ordered / Favourites — vertical 2-col."
    >
      <div className="relative max-h-[85vh] overflow-y-auto overscroll-contain bg-paper">
        <HomeProductShelves />
        <WeightCustomizer />
      </div>
    </DemoFrame>
  ),
  "home-pull-content": () => (
    <DemoFrame note="Same as /home: ProductSection + FruitsVeggies + Featured/Most ordered/Favourites + PTR.">
      <HomeCategoryProvider>
        <HomePullContent />
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "product-card": () => (
    <DemoFrame note="Clean elevated card (dual shadow + ring). Offer price + add/weight use black on green.">
      <div className="grid grid-cols-2 gap-4 bg-paper p-4">
        {SAMPLE_PRODUCTS.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <WeightCustomizer />
    </DemoFrame>
  ),
  "view-cart-bar": () => (
    <DemoFrame note="Green bar stays; cart icon + View cart copy are black. Add items via ProductCard first.">
      <div className="relative min-h-[240px] px-5 py-8 text-sm text-muted">
        Scroll the page to expand the bar when the cart has items.
        <ViewCartBar position="inline" />
      </div>
    </DemoFrame>
  ),
  "weight-customizer": () => (
    <DemoFrame>
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
      note="Same as /cart: Select a coupon → apply → back with code. Add items first (min order)."
    >
      <div className="relative h-[75vh] bg-paper">
        <CartPageContent
          chromePosition="inline"
          couponPickerHref="/playground/coupons-apply"
        />
      </div>
      <WeightCustomizer />
    </DemoFrame>
  ),
  checkout: () => (
    <DemoFrame
      surface="bare"
      note="Playground: Edit/Add address opens saved list → stub map + Detect → details. COD + Place Order stub."
    >
      <div className="relative h-[75vh] bg-paper">
        <CheckoutPageContent chromePosition="inline" />
      </div>
    </DemoFrame>
  ),
  "address-book": () => <AddressBookDemo initialStep="list" />,
  "address-manage": () => (
    <DemoFrame note="Same as /profile/addresses: black pin, star / edit / delete, Add New Address. Home Deliver to pin is black too.">
      <div className="bg-paper px-5 py-6">
        <h2 className="text-xl font-extrabold text-black">Address management</h2>
        <p className="mt-1 text-[13px] text-muted">
          Star a default, edit details, or remove an address.
        </p>
        <SavedAddressesManageList className="mt-5" />
      </div>
    </DemoFrame>
  ),
  "address-map": () => <AddressBookDemo initialStep="map" />,
  "address-details": () => <AddressBookDemo initialStep="map" note="Detect or search, Confirm → details form." />,
  "categories-hub": () => <CategoriesFlowDemo start="hub" />,
  "category-grid": () => <CategoriesFlowDemo start="hub" />,
  "category-plp": () => <CategoriesFlowDemo start="plp" />,
  "home-search-categories": () => <CategoriesFlowDemo start="home-search" />,
  "orders-list": () => (
    <DemoFrame note="Same as /orders: grocery cards (status chip, thumbs +N, View Details). Tap → /orders/[id].">
      <div className="relative max-h-[75vh] overflow-y-auto overscroll-contain">
        <OrdersPageContent chromePosition="inline" />
      </div>
    </DemoFrame>
  ),
  "order-detail": () => (
    <DemoFrame note="Same as /orders/[id]: ORDER STATUS card (received→confirmed→processed→shipped→delivered) + times.">
      <div className="relative max-h-[75vh] overflow-y-auto overscroll-contain">
        <OrderDetailPageContent
          chromePosition="inline"
          orderId="ord-1042"
        />
      </div>
    </DemoFrame>
  ),
  "empty-orders": () => (
    <DemoFrame note="Empty orders state.">
      <div className="relative max-h-[70vh] overflow-y-auto overscroll-contain">
        <OrdersPageContent chromePosition="inline" orders={[]} />
      </div>
    </DemoFrame>
  ),
  "product-detail": () => <ProductDetailDemo />,
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
    <DemoFrame note="UI-only auth stub. Verified step navigates to /home.">
      <div className="px-4 py-6">
        <LoginForm />
      </div>
    </DemoFrame>
  ),
  "verified-success": () => (
    <DemoFrame>
      <VerifiedSuccess />
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
  "coupons-list": () => (
    <DemoFrame note="Same as /coupons: ticket silhouette, status themes, tap → details + copy.">
      <div className="max-h-[75vh] overflow-y-auto overscroll-contain">
        <CouponsPageContent backHref="/playground" />
      </div>
    </DemoFrame>
  ),
  "coupons-apply": () => (
    <DemoFrame note="From cart Select: tap active ticket → Apply to cart → returns to cart-page with promo applied. Used/Expired cannot apply.">
      <div className="max-h-[75vh] overflow-y-auto overscroll-contain">
        <CouponsPageContent
          backHref="/playground/cart-page"
          applyReturnHref="/playground/cart-page"
        />
      </div>
    </DemoFrame>
  ),
  "coupons-empty": () => (
    <DemoFrame note="Same empty UI as /coupons when there are no coupons. Force-empty here for review.">
      <CouponsPageContent backHref="/playground" coupons={[]} />
    </DemoFrame>
  ),
  "profile-header": () => (
    <DemoFrame note="Hero sticky: transparent bar — only back stays; title hides; avatar not covered.">
      <div className="max-h-[28rem] overflow-y-auto overscroll-contain bg-paper">
        <section className="relative rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2.5rem]"
            aria-hidden
          >
            <div className="absolute -top-20 -right-16 size-52 rounded-full bg-leaf/10" />
          </div>
          <div className="relative px-5 pb-16">
            <PageHeader
              surface="hero"
              backHref="/playground"
              title="Profile"
            />
            <div className="relative mt-5 flex flex-col items-center text-center">
              <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(47,107,47,0.12)] ring-1 ring-leaf/15">
                <Image
                  src="/onboarding/brand-mark-white-y.svg"
                  alt=""
                  width={58}
                  height={69}
                  unoptimized
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h2 className="mt-4 text-[22px] leading-7 font-bold tracking-tight text-forest">
                Guest User
              </h2>
              <p className="mt-1 max-w-[260px] text-sm leading-5 text-muted">
                Sign in to sync your orders, coupons and wishlist.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
        {Array.from({ length: 10 }, (_, i) => (
          <p key={i} className="px-5 py-3 text-sm text-muted">
            Scroll block {i + 1} — back button stays sticky; title fades.
          </p>
        ))}
      </div>
    </DemoFrame>
  ),
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
