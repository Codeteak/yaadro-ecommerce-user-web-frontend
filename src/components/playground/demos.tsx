"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/navigation/BackButton";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  PullToRefresh,
  type PullToRefreshHandle,
} from "@/components/navigation/PullToRefresh";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { CategoryRail } from "@/components/home/CategoryRail";
import { OfferBanners } from "@/components/home/OfferBanners";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { ProductSection } from "@/components/home/ProductSection";
import { HomePullContent } from "@/components/home/HomePullContent";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { useCart } from "@/components/cart/CartContext";
import { SwipeToLogin } from "@/components/onboarding/SwipeToLogin";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { GreenCornerAccents } from "@/components/onboarding/GreenCornerAccents";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";
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

const BUILT_DEMOS: Record<string, () => ReactNode> = {
  "back-button": () => (
    <DemoFrame note="Green squircle + black arrow — same default as storefront PageHeader / cart / profile.">
      <div className="flex h-16 items-center px-5">
        <BackButton href="/playground" />
      </div>
    </DemoFrame>
  ),
  "page-header": () => (
    <DemoFrame note="Uses shared BackButton (black arrow on green squircle).">
      <div className="px-5 pt-4 pb-6">
        <PageHeader backHref="/playground" title="Sample title" />
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
    <DemoFrame note="Uses Yaadro fallback avatar (no shop-profile API yet).">
      <div className="bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8] px-5 pt-4 pb-8">
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
    <DemoFrame>
      <div className="py-4">
        <OfferBanners />
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
    <DemoFrame>
      <HomeCategoryProvider>
        <ProductSection />
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "home-pull-content": () => (
    <DemoFrame note="Same block that sits under the category rail on /home.">
      <HomeCategoryProvider>
        <HomePullContent />
      </HomeCategoryProvider>
    </DemoFrame>
  ),
  "product-card": () => (
    <DemoFrame note="Offer price + add/weight/qty controls use black on the green button.">
      <div className="grid grid-cols-2 gap-4 p-4">
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
    <DemoFrame>
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <Image
          src="/cart/empty-cart-smooth.png"
          alt=""
          width={1024}
          height={1024}
          className="h-auto w-44"
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
    </DemoFrame>
  ),
  "empty-wishlist": () => (
    <DemoFrame>
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <Image
          src="/wishlist/empty-wishlist.png"
          alt=""
          width={1310}
          height={1200}
          className="h-auto w-52"
        />
        <h2 className="mt-5 text-xl font-extrabold text-ink">
          Your wishlist is empty
        </h2>
        <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
          Tap the heart on a product to save it here for later.
        </p>
        <Link
          href="/home"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright"
        >
          Shop now
        </Link>
      </div>
    </DemoFrame>
  ),
  "cart-page": () => (
    <DemoFrame note="Same CartPageContent as /cart: green pay bar, black type, animated Together to pay, Clear basket.">
      <CartPageContent />
      <WeightCustomizer />
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
    <DemoFrame note="Shared stub used by coupons, orders, addresses, etc.">
      <ComingSoonPage
        title="Sample stub"
        description="This is the ComingSoonPage shell used across unfinished storefront routes."
        backHref="/playground"
      />
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
