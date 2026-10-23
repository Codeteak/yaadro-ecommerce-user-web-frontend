import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { OfferFlyer } from "@/components/home/OfferFlyer";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Home",
  description: "Fresh groceries, right at your door — shop Yaadro.",
};

export default async function StorefrontHomePage() {
  const shop = await getShopSeo();
  // Until the shop-profile API exists there is no per-shop photo, so the
  // avatar uses the white-Y D mark instead of the wide OG banner.
  const shopImage = process.env.NEXT_PUBLIC_SHOP_PROFILE_URL
    ? shop.image
    : "/onboarding/brand-mark-white-y.svg";
  return (
    <HomeCategoryProvider>
    <ScrollToTopOnLoad />
    <main className="relative min-h-dvh overflow-x-clip bg-paper">
      {/* ── Curved hero: text left, grocery cart right ─────────────────── */}
      <section className="relative">
        <div className="relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8]">
          {/* soft decorative rings */}
          <div
            className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full border-[1.25rem] border-white/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-24 right-[38%] h-20 w-20 rounded-full bg-white/20"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-10 -bottom-24 h-56 w-56 rounded-full border-[1.5rem] border-leaf/10"
            aria-hidden
          />

          <div className="relative mx-auto w-full max-w-lg px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <HomeTopBar shopName={shop.name} shopImage={shopImage} />

            <div className="flex items-center gap-2 pt-4 pb-28">
              <div className="min-w-0 flex-1">
                <h1 className="text-[1.7rem] leading-[1.12] font-extrabold tracking-tight text-forest">
                  Choose &amp; customize your order —{" "}
                  <span className="text-leaf">get it fresh.</span>
                </h1>
                <Link
                  href="/categories"
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-track px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  Shop now
                </Link>
              </div>

              <div className="relative w-[46%] max-w-[220px] shrink-0">
                <div
                  className="absolute inset-x-2 top-6 bottom-0 rounded-full bg-white/35 blur-md"
                  aria-hidden
                />
                <Image
                  src="/home/cart-hero-exact.png"
                  alt="Grocery cart filled with fresh food and a Yaadro bag"
                  width={1671}
                  height={941}
                  priority
                  // The file is the exact full frame (never cut/trimmed);
                  // it is only scaled so the cart fills the column while
                  // its transparent margins overflow invisibly.
                  style={{ width: "186%", marginLeft: "-47.7%" }}
                  className="relative h-auto max-w-none drop-shadow-[0_18px_28px_rgba(47,107,47,0.3)]"
                />
              </div>
            </div>

          </div>

          {/* curved bottom edge — ends higher, middle dipped */}
          <svg
            className="absolute inset-x-0 bottom-0 h-[64px] w-full text-paper"
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 18 C 360 66, 1080 66, 1440 18 L1440 70 L0 70 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* category circles riding the curve, infinite loop */}
        <div className="relative z-10 mx-auto -mt-[4.25rem] w-full max-w-lg">
          <CategoryRail />
        </div>
      </section>

      {/* Banners + products: pull-to-refresh spinner appears under categories */}
      <HomePullContent />

      {/* Special-campaign pop-up flyer (once per day per campaign) */}
      <OfferFlyer />
    </main>
    </HomeCategoryProvider>
  );
}
