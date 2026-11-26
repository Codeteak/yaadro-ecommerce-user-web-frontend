/**
 * Paste-friendly usage snippets for playground demos.
 * Shown under each demo with a Copy control for handoff.
 */

export type PlaygroundUsage = {
  /** Primary paste target — imports + mount example. */
  code: string;
  /** Related source files a new project would need. */
  files?: readonly string[];
};

const U = (code: string, files?: readonly string[]): PlaygroundUsage => ({
  code: code.trim() + "\n",
  files,
});

export const PLAYGROUND_USAGE: Record<string, PlaygroundUsage> = {
  "back-button": U(
    `import { BackButton } from "@/components/navigation/BackButton";

<BackButton href="/home" />
// or: <BackButton onClick={() => router.back()} />`,
    ["src/components/navigation/BackButton.tsx"],
  ),
  "close-button": U(
    `import { CloseButton } from "@/components/navigation/CloseButton";

<CloseButton onClick={onClose} />`,
    ["src/components/navigation/CloseButton.tsx"],
  ),
  "page-header": U(
    `import { PageHeader } from "@/components/navigation/PageHeader";

<PageHeader backHref="/home" title="Cart" />`,
    ["src/components/navigation/PageHeader.tsx"],
  ),
  "bottom-nav": U(
    `import { BottomNav } from "@/components/navigation/BottomNav";
import { shouldHideStorefrontNav } from "@/lib/storefront-nav";
import { useScrollDirection } from "@/components/navigation/useScrollDirection";

// Path-hidden on /cart, /checkout, /orders/[id], profile tasks
// Scroll-hidden via useScrollDirection (window + nested overflow)
// When hidden: inert + blur focused tab (avoid aria-hidden-on-focus warning)
<BottomNav />`,
    [
      "src/components/navigation/BottomNav.tsx",
      "src/components/navigation/useScrollDirection.ts",
      "src/lib/storefront-nav.ts",
      "src/components/storefront/StorefrontChrome.tsx",
    ],
  ),
  "pull-to-refresh": U(
    `import { PullToRefresh } from "@/components/navigation/PullToRefresh";

// Passive touch listeners — never preventDefault (avoids SE scroll-stuck).
<PullToRefresh onRefresh={async () => { /* refetch */ }}>
  {children}
</PullToRefresh>`,
    ["src/components/navigation/PullToRefresh.tsx"],
  ),
  "scroll-to-top": U(
    `import { ScrollToTopOnLoad } from "@/components/navigation/ScrollToTopOnLoad";

<ScrollToTopOnLoad />`,
    ["src/components/navigation/ScrollToTopOnLoad.tsx"],
  ),
  "home-top-bar": U(
    `import { HomeTopBar } from "@/components/home/HomeTopBar";

<HomeTopBar shopName="Yaadro" shopImage="/onboarding/brand-mark-white-y.svg" />
<HomeTopBar shopName="Yaadro" shopImage="/onboarding/brand-mark-white-y.svg" signedIn />
// Playground outside-radius paint:
<HomeTopBar shopName="Yaadro" shopImage="…" previewOutsideRadius />`,
    [
      "src/components/home/HomeTopBar.tsx",
      "src/lib/delivery-address.ts",
      "src/lib/refresh-delivery-serviceable.ts",
      "public/icons/profile-signed-in.svg",
    ],
  ),
  "deferred-location": U(
    `import { DeferredLocationPrompt } from "@/components/delivery/DeferredLocationPrompt";

// Wired on /home — Detect/confirm pin saves, runs radius preview, closes
<DeferredLocationPrompt />
// Playground: <DeferredLocationPrompt forcePreview delayMs={900} />
// Leaked locks: BodyScrollUnlockOnNavigate + reconcileBodyScrollLock`,
    [
      "src/components/delivery/DeferredLocationPrompt.tsx",
      "src/components/delivery/AddressBookSheet.tsx",
      "src/components/navigation/BodyScrollUnlockOnNavigate.tsx",
      "src/lib/use-body-scroll-lock.ts",
      "src/lib/delivery-address.ts",
      "src/lib/refresh-delivery-serviceable.ts",
      "src/lib/db/location.ts",
      "src/app/(storefront)/home/page.tsx",
    ],
  ),
  "pwa-install-prompt": U(
    `import { InstallPrompt } from "@/components/pwa/InstallPrompt";

// Live: AppProviders mounts <InstallPrompt /> — opens only on /home
// Dismiss / appinstalled → forceClearBodyScrollLock (no route change)
// Shell also reconciles on focus / visibility / pageshow
// Dismiss → sessionStorage (clears when browser session ends)
// Playground: <InstallPrompt forcePreview />`,
    [
      "src/components/pwa/InstallPrompt.tsx",
      "src/lib/use-body-scroll-lock.ts",
      "src/components/navigation/BodyScrollUnlockOnNavigate.tsx",
      "src/components/providers/AppProviders.tsx",
    ],
  ),

  "help-support": U(
    `import { HelpSupportContent } from "@/components/profile/HelpSupportContent";
import { getShopSupportContact } from "@/lib/shop-support";

// Ecom /profile/support
const contact = await getShopSupportContact();
<HelpSupportContent contact={contact} backHref="/profile" />

// Playground: SAMPLE_SHOP_SUPPORT
// Optional until API: NEXT_PUBLIC_SHOP_SUPPORT_PHONE / _ADDRESS / _MAPS_URL`,
    [
      "src/components/profile/HelpSupportContent.tsx",
      "src/lib/shop-support.ts",
      "src/lib/sample-shop-support.ts",
      "src/app/(storefront)/profile/support/page.tsx",
      "public/icons/support.png",
    ],
  ),
  "shop-fallback-avatars": U(
    `import { SHOP_IMAGE_FALLBACK } from "@/lib/shop-fallback-avatars";

// Wired on getShopSeo + storefront resolve (no shop_image → this path)
// SHOP_IMAGE_FALLBACK === "/icons/shop-fallback-awning-yellow.png"`,
    [
      "src/lib/shop-fallback-avatars.ts",
      "src/lib/shop-seo.ts",
      "src/lib/api/storefront.ts",
      "public/icons/shop-fallback-awning-yellow.png",
    ],
  ),
  search: U(
    `import {
  HOME_SEARCH_PLACEHOLDER_SAMPLES,
  HomeSearchBar,
} from "@/components/home/HomeSearchBar";

<HomeSearchBar
  activateHref="/categories?focus=search"
  filterHref="/categories?focus=search&chips=1"
  placeholderSamples={HOME_SEARCH_PLACEHOLDER_SAMPLES}
/>`,
    ["src/components/home/HomeSearchBar.tsx"],
  ),
  "search-placeholder-motion": U(
    `import {
  HOME_SEARCH_SAMPLE_TERMS,
  HomeSearchBar,
  type SearchPlaceholderMotion,
} from "@/components/home/HomeSearchBar";

<HomeSearchBar
  activateHref="/categories?focus=search"
  placeholderTerms={HOME_SEARCH_SAMPLE_TERMS}
  placeholderMotion={"tick" satisfies SearchPlaceholderMotion}
/>`,
    [
      "src/components/home/HomeSearchBar.tsx",
      "src/components/home/HomeSearchPlaceholder.tsx",
    ],
  ),
  "multi-phone-layout": U(
    `// See MULTI_PHONE_LAYOUT_PLAN.md (repo root)
// Live /profile: ProfileScreen scrolls with bottom-nav clearance
// ProductCard: aspect-[5/4] + smaller add on max-[390px]

import { ProfileScreen } from "@/components/profile/ProfileScreen";

<div className="h-[667px] overflow-y-auto">
  <ProfileScreen preview={{ signedIn: false }} backHref="/playground" />
</div>`,
    [
      "src/app/(storefront)/profile/page.tsx",
      "src/components/profile/ProfileScreen.tsx",
      "src/components/product/ProductCard.tsx",
      "MULTI_PHONE_LAYOUT_PLAN.md",
    ],
  ),
  "home-search-categories": U(
    `// Home search → categories hub with focus=search
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { CategoriesHub } from "@/components/categories/CategoriesHub";

// On /home: navigate to /categories?focus=search
// On /categories: <CategoriesHub focusSearch />`,
    [
      "src/components/home/HomeSearchBar.tsx",
      "src/components/categories/CategoriesHub.tsx",
    ],
  ),
  "categories-hub": U(
    `import { CategoriesHub } from "@/components/categories/CategoriesHub";

<CategoriesHub
  focusSearch={false}
  categoryHref={(cat) => \`/categories/\${cat.slug}\`}
/>`,
    [
      "src/components/categories/CategoriesHub.tsx",
      "src/lib/catalog-taxonomy.ts",
    ],
  ),
  "category-card-shared": U(
    `import { CategoryCard } from "@/components/categories/CategoryCard";

// Phase B #28 — image if present, else icon + name
<CategoryCard name="Fruits" image="/categories/fruits.jpg" variant="pill" />
<CategoryCard name="No photo" image="" variant="card" />`,
    [
      "src/components/categories/CategoryCard.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/playground/PhaseBCategoryCardDemo.tsx",
    ],
  ),
  "storefront-shell": U(
    `import { StorefrontPageFrame } from "@/components/storefront/StorefrontPageFrame";

// Phase B #29 — live /categories, /wishlist, /orders
<StorefrontPageFrame title="Orders" backHref="/home">
  {/* page body */}
</StorefrontPageFrame>
// BottomNav still from StorefrontChrome`,
    [
      "src/components/storefront/StorefrontPageFrame.tsx",
      "src/components/playground/PhaseBShellDemo.tsx",
      "src/components/navigation/PageHeader.tsx",
      "src/components/navigation/BottomNav.tsx",
    ],
  ),
  "home-more-sections": U(
    `import { CategoryProductRails } from "@/components/home/CategoryProductRails";
import { categoryProductRails } from "@/lib/home-category-rails";
import { PhaseBHomeSectionsDemo } from "@/components/playground/PhaseBHomeSectionsDemo";

// Live /home: browse seed + bucket rails + soft PLP fill (all shops)
// categoryProductRails(catalog.categories, catalog.productsBySlug)
// /api/warm → loadHomeCatalog (same cache keys)
<CategoryProductRails rails={rails} />

// Playground stack demo
<PhaseBHomeSectionsDemo />`,
    [
      "src/components/playground/PhaseBHomeSectionsDemo.tsx",
      "src/components/home/CategoryProductRails.tsx",
      "src/lib/home-category-rails.ts",
      "src/lib/home-catalog-bucket.ts",
      "src/lib/catalog-browse.ts",
      "src/lib/map-pool.ts",
      "src/lib/db/pool.ts",
      "src/app/api/warm/route.ts",
      "src/components/home/HomePullContent.tsx",
      "src/components/home/HomeProductShelves.tsx",
    ],
  ),
  "category-browser": U(
    `import { CategoryBrowser } from "@/components/categories/CategoryBrowser";

{/* Legacy sidebar — live /categories uses railLayout="horizontal" */}
<CategoryBrowser
  branches={branches}
  products={products}
  railLayout="sidebar"
/>
// Search filter toggles PlpFilterChips (expand/collapse)
// Chips open Filter / Brands / Type / Sort sheets`,
    [
      "src/components/categories/CategoryBrowser.tsx",
      "src/components/categories/PlpFilterChips.tsx",
      "src/components/categories/PlpFilterSheets.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/home/HomeSearchBar.tsx",
      "src/app/(storefront)/categories/page.tsx",
    ],
  ),
  "category-grid": U(
    `// Alias of categories hub grid — same CategoriesHub
import { CategoriesHub } from "@/components/categories/CategoriesHub";

<CategoriesHub />`,
    ["src/components/categories/CategoriesHub.tsx"],
  ),
  "category-plp": U(
    `import { CategoryListing } from "@/components/categories/CategoryListing";

{/* Legacy sidebar PLP — playground only */}
<CategoryListing
  slug="vegetables"
  backHref="/categories"
  railLayout="sidebar"
/>`,
    [
      "src/components/categories/CategoryListing.tsx",
      "src/components/categories/PlpFilterChips.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/categories/PlpFilterSheets.tsx",
      "src/lib/plp-filters.ts",
      "src/lib/catalog-taxonomy.ts",
    ],
  ),
  "category-plp-horizontal": U(
    `import { CategoryListing } from "@/components/categories/CategoryListing";

{/* Same as live /categories/[slug] */}
<CategoryListing
  slug="vegetables"
  backHref="/categories"
  railLayout="horizontal"
/>`,
    [
      "src/components/categories/CategoryListing.tsx",
      "src/app/(storefront)/categories/[slug]/page.tsx",
      "src/components/categories/CachedCategoryPage.tsx",
      "src/components/home/HomeSearchBar.tsx",
      "src/components/home/CategoryRail.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/categories/PlpFilterChips.tsx",
      "src/components/categories/PlpFilterSheets.tsx",
    ],
  ),
  "category-rail": U(
    `import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";

// Same as /home under banners
<HomeCategoryProvider>
  <CategoryRail tileVariant="pill" />
</HomeCategoryProvider>`,
    [
      "src/components/home/CategoryRail.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/home/HomeCategoryContext.tsx",
      "src/lib/home-categories.ts",
    ],
  ),
  "offer-banners": U(
    `import { OfferBanners } from "@/components/home/OfferBanners";

// Live /home — image only (copy is in the creative)
<OfferBanners banners={shop.banners} />

// Playground samples — title / subtitle / Shop now overlay
<OfferBanners allowSample />`,
    ["src/components/home/OfferBanners.tsx"],
  ),
  "offer-flyer": U(
    `import { OfferFlyer } from "@/components/home/OfferFlyer";

<OfferFlyer />`,
    ["src/components/home/OfferFlyer.tsx"],
  ),
  "product-section": U(
    `import { ProductSection } from "@/components/home/ProductSection";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";

<HomeCategoryProvider>
  <ProductSection />
</HomeCategoryProvider>`,
    [
      "src/components/home/ProductSection.tsx",
      "src/components/home/HomeCategoryContext.tsx",
    ],
  ),
  "fruits-veggies-section": U(
    `import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";

<FruitsVeggiesSection />
// Browse all → /categories/fruits (All|Fruits) or /categories/vegetables`,
    [
      "src/components/home/FruitsVeggiesSection.tsx",
      "public/home/fruits-veggies-section.jpg",
    ],
  ),
  "daily-dairy-layouts": U(
    `import { DailyDairySection } from "@/components/home/DailyDairySection";
import { SAMPLE_DAIRY_SHELF } from "@/lib/daily-dairy";

// Playground keeps A + C; live /home uses layout A only
<DailyDairySection layout="on-art" shelf={SAMPLE_DAIRY_SHELF} />
<DailyDairySection layout="split" shelf={SAMPLE_DAIRY_SHELF} />`,
    [
      "src/components/home/DailyDairySection.tsx",
      "src/lib/daily-dairy.ts",
      "public/home/daily-dairy-section-v2.jpg",
    ],
  ),
  "daily-dairy-section": U(
    `import { DailyDairySection } from "@/components/home/DailyDairySection";
import { pickDairyShelf } from "@/lib/daily-dairy";

// Live /home: pickDairyShelf(shelves) → layout A → /dairy
<DailyDairySection layout="on-art" shelf={dairyShelf} browseHref="/dairy" />`,
    [
      "src/components/home/DailyDairySection.tsx",
      "src/lib/daily-dairy.ts",
      "public/home/daily-dairy-section-v2.jpg",
    ],
  ),
  "daily-dairy-page": U(
    `import { DailyDairyPageContent } from "@/components/home/DailyDairyPageContent";
import { pickDairyShelf } from "@/lib/daily-dairy";

// Live /dairy: listHomeShelves + pickDairyShelf
<DailyDairyPageContent shelf={shelf} backHref="/home" />`,
    [
      "src/components/home/DailyDairyPageContent.tsx",
      "src/app/(storefront)/dairy/page.tsx",
      "public/home/daily-dairy-section-v2.jpg",
    ],
  ),
  "festive-offers-section": U(
    `import { FestiveOffersSection } from "@/components/home/FestiveOffersSection";
import { FestiveHeroCard } from "@/components/home/FestiveHeroCard";
import { SAMPLE_FESTIVE_SHELF } from "@/lib/festive-offers";

// Live /home: pickFestiveShelf(shelves) → title on FestiveHeroCard → /festive
<FestiveOffersSection shelf={SAMPLE_FESTIVE_SHELF} seeAllHref="/festive" />`,
    [
      "src/components/home/FestiveOffersSection.tsx",
      "src/components/home/FestiveHeroCard.tsx",
      "src/lib/festive-offers.ts",
      "public/home/festive-section.jpg",
    ],
  ),
  "festive-offers-page": U(
    `import { FestiveOffersPageContent } from "@/components/home/FestiveOffersPageContent";
import { SAMPLE_FESTIVE_SHELF } from "@/lib/festive-offers";

// Live /festive loads shelves via listHomeShelves + pickFestiveShelf
<FestiveOffersPageContent shelf={SAMPLE_FESTIVE_SHELF} backHref="/home" />`,
    [
      "src/components/home/FestiveOffersPageContent.tsx",
      "src/lib/festive-offers.ts",
    ],
  ),
  "category-browse-sections": U(
    `import { FruitsVeggiesSection } from "@/components/home/FruitsVeggiesSection";
import { CategoryBrowseSections } from "@/components/home/CategoryBrowseSections";
import { SAMPLE_CATEGORY_BROWSE_SECTIONS } from "@/lib/home-category-browse";

// Playground / hub tile grid (not live /home product rails)
<>
  <FruitsVeggiesSection />
  <CategoryBrowseSections
    layout="rect-first"
    className="bg-paper [&_h2]:text-ink"
    sections={SAMPLE_CATEGORY_BROWSE_SECTIONS}
  />
</>`,
    [
      "src/components/home/CategoryBrowseSections.tsx",
      "src/lib/home-category-browse.ts",
      "src/components/home/FruitsVeggiesSection.tsx",
    ],
  ),
  "type-scale": U(
    `import { TypeScaleProvider } from "@/components/ui/TypeScaleContext";
import { TYPE_SCALE } from "@/lib/type-scale";

// Wrap storefront (or playground) to use heading tokens:
<TypeScaleProvider scale="spec">
  {children}
</TypeScaleProvider>

// Tokens: TYPE_SCALE.spec | TYPE_SCALE.legacy`,
    ["src/lib/type-scale.ts", "src/components/ui/TypeScaleContext.tsx"],
  ),
  "home-product-shelves": U(
    `import { HomeProductShelves } from "@/components/home/HomeProductShelves";

<HomeProductShelves />`,
    [
      "src/components/home/HomeProductShelves.tsx",
      "src/components/home/HomeProductShelf.tsx",
      "src/lib/home-shelves.ts",
    ],
  ),
  "home-pull-content": U(
    `import { HomePullContent } from "@/components/home/HomePullContent";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";

<HomeCategoryProvider>
  <HomePullContent />
</HomeCategoryProvider>`,
    ["src/components/home/HomePullContent.tsx"],
  ),
  "brand-footer": U(
    `import { BrandFooter } from "@/components/storefront/BrandFooter";

<BrandFooter />`,
    ["src/components/storefront/BrandFooter.tsx"],
  ),
  "product-card": U(
    `import { ProductCard } from "@/components/product/ProductCard";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

{/* Default — home rails + cart “You may also like” */}
<ProductCard product={SAMPLE_PRODUCTS[0]} />
{/* Compact — optional denser size (not used on cart rail anymore) */}
<ProductCard product={SAMPLE_PRODUCTS[0]} size="compact" />
// Needs CartProvider (+ optional WishlistProvider)`,
    [
      "src/components/product/ProductCard.tsx",
      "src/lib/sample-products.ts",
      "src/lib/product-card-layout.ts",
    ],
  ),
  "view-cart-bar": U(
    `import { ViewCartBar } from "@/components/cart/ViewCartBar";
import { shouldHideStorefrontNav } from "@/lib/storefront-nav";

// Storefront chrome: same path-hide as BottomNav
{!shouldHideStorefrontNav(pathname) && <ViewCartBar />}
// Playground demos use position="inline" (skips path-hide)`,
    [
      "src/components/cart/ViewCartBar.tsx",
      "src/components/storefront/StorefrontChrome.tsx",
      "src/lib/storefront-nav.ts",
    ],
  ),
  "weight-customizer": U(
    `import { WeightCustomizer } from "@/components/cart/WeightCustomizer";
import { useCart } from "@/components/cart/CartContext";

// Open sheet:
const { setCustomizing } = useCart();
setCustomizing(product);

// Mount once near root:
<WeightCustomizer />`,
    ["src/components/cart/WeightCustomizer.tsx"],
  ),
  "empty-cart": U(
    `import { CartPageContent } from "@/components/cart/CartPageContent";

// Empty when cart has no items:
<CartPageContent chromePosition="inline" />`,
    [
      "src/components/cart/CartPageContent.tsx",
      "public/cart/empty-cart-smooth.png",
    ],
  ),
  "empty-wishlist": U(
    `import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";

<WishlistProvider previewSignedIn initialIds={[]}>
  <WishlistPageContent chromePosition="inline" />
</WishlistProvider>`,
    [
      "src/components/wishlist/WishlistPageContent.tsx",
      "public/wishlist/empty-wishlist.png",
    ],
  ),
  "cart-page": U(
    `import { CartPageContent } from "@/components/cart/CartPageContent";

{/* Live-shaped cart: shop bill + typed coupon; playground uses sample coupons */}
<CartPageContent
  showPriceMayVary
  showCartSuggestions
  couponPickerHref="/coupons?from=cart"
  previewSignedIn
  sampleCoupons
/>`,
    [
      "src/app/(storefront)/cart/page.tsx",
      "src/components/cart/CartPageContent.tsx",
      "src/lib/cart-store.ts",
      "src/components/cart/CartSuggestions.tsx",
      "src/components/product/ProductCard.tsx",
      "src/lib/cart-suggestions.ts",
      "src/lib/product-card-layout.ts",
      "src/components/storefront/PriceMayVaryNotice.tsx",
    ],
  ),
  "product-detail": U(
    `import { ProductDetail } from "@/components/product/ProductDetail";
import { getSampleProduct } from "@/lib/sample-products";

{/* Same as live /product/[id] */}
<ProductDetail
  product={getSampleProduct("vg-3")!}
  backHref="/home"
  showPriceMayVary
/>`,
    [
      "src/components/product/ProductDetail.tsx",
      "src/components/storefront/PriceMayVaryNotice.tsx",
    ],
  ),
  "price-may-vary": U(
    `import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";

<PriceMayVaryNotice variant="banner" />
<PriceMayVaryNotice variant="soft" />`,
    ["src/components/storefront/PriceMayVaryNotice.tsx"],
  ),
  "price-vary-explain": U(
    `import { PriceMayVaryExplainSheet } from "@/components/storefront/PriceMayVaryExplainSheet";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";

// Notice is display-only (no ?)
<PriceMayVaryNotice variant="soft" />

// Phase D #33 — popup on Checkout, then continue to checkout
<PriceMayVaryExplainSheet
  open={open}
  onOpenChange={setOpen}
  continueLabel="Continue to checkout"
  onContinue={() => goCheckout()}
  onHelpClick={() => goHelp()}
/>`,
    [
      "src/components/playground/PhaseDPriceVaryExplainDemo.tsx",
      "src/components/storefront/PriceMayVaryExplainSheet.tsx",
      "src/components/storefront/PriceMayVaryNotice.tsx",
      "src/lib/nav-return-stack.ts",
      "src/lib/price-may-vary.ts",
    ],
  ),
  "onboarding-screen": U(
    `import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";

<OnboardingScreen />`,
    ["src/components/onboarding/OnboardingScreen.tsx"],
  ),
  "green-corners": U(
    `// Corner brand wash used behind onboarding / login chrome
// See OnboardingScreen / login layout styles in globals + onboarding components.`,
    ["src/components/onboarding/OnboardingScreen.tsx"],
  ),
  "swipe-to-login": U(
    `import { SwipeToLogin } from "@/components/onboarding/SwipeToLogin";

<SwipeToLogin onComplete={() => router.push("/login")} />`,
    ["src/components/onboarding/SwipeToLogin.tsx"],
  ),
  "phone-otp": U(
    `import { PhoneInput } from "@/features/auth/PhoneInput";
import { OtpInput } from "@/features/auth/OtpInput";

<PhoneInput value={phone} onChange={setPhone} />
<OtpInput value={otp} onChange={setOtp} />`,
    ["src/features/auth/PhoneInput.tsx", "src/features/auth/OtpInput.tsx"],
  ),
  "login-form": U(
    `import { LoginForm } from "@/features/auth/LoginForm";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";

// /login wraps getShopSeo → ShopNameProvider; after OTP → Welcome to {shop} → /home
<ShopNameProvider name="Green Basket">
  <LoginForm />
</ShopNameProvider>`,
    ["src/app/login/page.tsx", "src/features/auth/"],
  ),
  "verified-success": U(
    `import { VerifiedSuccess } from "@/features/auth/VerifiedSuccess";

// OTP in flight — spinner, no check
<VerifiedSuccess shopName="Green Basket" status="confirming" />
// After verify — check + Welcome to Green Basket
<VerifiedSuccess shopName="Green Basket" status="success" />`,
    ["src/features/auth/VerifiedSuccess.tsx", "src/features/auth/LoginForm.tsx"],
  ),
  "coming-soon": U(
    `import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

<ComingSoonPage
  title="Settings"
  description="This section is coming soon."
  backHref="/profile"
/>`,
    ["src/components/storefront/ComingSoonPage.tsx"],
  ),
  "not-found": U(
    `import { NotFoundContent } from "@/components/storefront/NotFoundContent";

// Global route: src/app/not-found.tsx
export default function NotFound() {
  return <NotFoundContent />;
}`,
    [
      "src/components/storefront/NotFoundContent.tsx",
      "src/app/not-found.tsx",
      "public/errors/404-explorer.png",
    ],
  ),
  "coupons-list": U(
    `import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

// Same default as /coupons (comfortable ticket body)
<CouponsPageContent />`,
    [
      "src/components/coupons/CouponsPageContent.tsx",
      "src/components/coupons/CouponTicketCard.tsx",
      "src/app/(storefront)/coupons/page.tsx",
    ],
  ),
  "coupons-empty": U(
    `import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

// Signed-in empty list:
<CouponsPageContent coupons={[]} previewSignedIn />`,
    ["src/components/coupons/CouponsPageContent.tsx"],
  ),
  "coupons-guest": U(
    `import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

// Guest gate (playground force):
<CouponsPageContent previewSignedIn={false} />`,
    ["src/components/coupons/CouponsPageContent.tsx"],
  ),
  "coupons-apply": U(
    `import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

// Apply from cart — returns to cart after select:
<CouponsPageContent
  backHref="/cart"
  applyReturnHref="/cart"
/>`,
    ["src/components/coupons/CouponsPageContent.tsx"],
  ),
  "profile-options-refine": U(
    `import { ProfileOptionsList } from "@/components/profile/ProfileOptionsList";

// Live /profile More list (guest + signed-in)
<ProfileOptionsList signedIn={false} hideAddressRow />
<ProfileOptionsList signedIn hideAddressRow />`,
    [
      "src/components/profile/ProfileOptionsList.tsx",
      "src/components/profile/ProfileOptionRow.tsx",
      "src/lib/profile-options.ts",
      "public/icons/wishlist.svg",
      "public/icons/coupon.svg",
      "public/icons/support.png",
    ],
  ),
  "profile-header": U(
    `import { ProfileScreen } from "@/components/profile/ProfileScreen";

// Live /profile — guest, signed-in, error, offline via useMyProfile
<ProfileScreen />

// Playground preview (dry-run logout / name save)
<ProfileScreen
  preview={{
    signedIn: true,
    profile: {
      user: { id: "user-123", name: "Priya Nair", phone: "9876543210" },
      customer: { id: "c1", displayName: null },
      address: null,
    },
  }}
  dryRun
/>`,
    [
      "src/components/profile/ProfileScreen.tsx",
      "src/components/profile/hooks/useMyProfile.ts",
      "src/lib/api/profile.ts",
      "src/lib/default-profile-avatar.ts",
      "public/icons/guest-profile.png",
      "public/avatars/",
    ],
  ),
  "checkout-coupon": U(
    `import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

// Playground fixture — Coupon −₹ visible for testers
<CheckoutPageContent
  chromePosition="inline"
  previewSignedIn
  demoBill={{
    subtotalRupees: 599,
    couponCode: "FRESH10",
    couponDiscountRupees: 50,
    saveRupees: 120,
    totalRupees: 479,
  }}
/>

// Live: short sticky To pay + Place Order; success → OrderPlacedContent
<CheckoutPageContent liveShopPricing showPriceMayVary />`,
    [
      "src/components/checkout/CheckoutPageContent.tsx",
      "src/components/checkout/CheckoutOrderSummary.tsx",
      "src/lib/place-order.ts",
    ],
  ),
  checkout: U(
    `import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
// Guest Place Order → /login?next=/checkout

<CheckoutPageContent showPriceMayVary previewSignedIn={false} />`,
    [
      "src/components/checkout/CheckoutPageContent.tsx",
      "src/components/checkout/CheckoutOrderSummary.tsx",
      "src/components/checkout/OrderPlacedContent.tsx",
      "src/components/storefront/PriceMayVaryNotice.tsx",
      "public/checkout/order-confirmed-mascot.png",
    ],
  ),
  "order-placed": U(
    `import {
  OrderPlacedContent,
  SAMPLE_ORDER_PLACED,
} from "@/components/checkout/OrderPlacedContent";

<OrderPlacedContent
  summary={SAMPLE_ORDER_PLACED}
  ordersHref="/playground/orders-list"
  homeHref="/playground"
/>`,
    [
      "src/components/checkout/OrderPlacedContent.tsx",
      "public/checkout/order-confirmed-mascot.png",
    ],
  ),
  "orders-list": U(
    `import { OrdersPageContent } from "@/components/orders/OrdersPageContent";

// Storefront /orders
<OrdersPageContent />`,
    [
      "src/app/(storefront)/orders/page.tsx",
      "src/components/orders/OrdersPageContent.tsx",
      "src/components/orders/lead-order-shared.tsx",
    ],
  ),
  "order-detail": U(
    `import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";

// Classic order details (not live track)
<OrderDetailPageContent
  orderId="ord-1042"
  backHref="/orders"
  shopHref="/home"
  nestedLinesScroll
/>
// Long bill preview: /playground/order-detail?id=ord-1050
// Track order → /orders/ord-1042/track
// Receipt / Download bill → OrderTicketBill`,
    [
      "src/app/(storefront)/orders/[id]/page.tsx",
      "src/components/orders/OrderDetailPageContent.tsx",
      "src/components/orders/lead-order-shared.tsx",
      "src/lib/sample-orders.ts",
    ],
  ),
  "order-bill-coupon": U(
    `import { mapCustomerOrder } from "@/lib/api/map-customer-order";
import { billedTotal } from "@/lib/orders-bill";

// Prefer coupon_discount_minor when coupon_code is set
const order = mapCustomerOrder({
  coupon_code: "TEST",
  coupon_discount_minor: 100_000, // ₹1000
  promotion_discount_total_minor: 355_000, // ignore when code present
  subtotal_before_coupon_minor: 245_000,
  // ...
});
// bill: Item − Coupon + Delivery = billedTotal(order)`,
    [
      "src/components/playground/OrderBillCouponFixDemo.tsx",
      "src/lib/api/map-customer-order.ts",
      "src/lib/orders-bill.ts",
    ],
  ),
  "live-order-track": U(
    `import { LiveOrderTrack } from "@/components/orders/LiveOrderTrack";
import { OrderLiveTrackPage } from "@/components/orders/OrderLiveTrackPage";

// Playground phase demo — Download Bill uses same OrderTicketBill
<LiveOrderTrack phase="out_for_delivery" order={getOrder("ord-1042")} />

// Ecom (separate from /orders/[id] details):
// /orders/[id]/track → <OrderLiveTrackPage orderId={id} />`,
    [
      "src/components/orders/LiveOrderTrack.tsx",
      "src/components/orders/OrderLiveTrackPage.tsx",
      "src/lib/live-order-track.ts",
      "src/lib/order-live-track.ts",
      "src/lib/api/orders.ts",
      "src/app/(storefront)/orders/[id]/track/page.tsx",
      "public/orders/live-track/order-accepted.png",
      "public/orders/live-track/packed.png",
      "public/orders/live-track/out-for-delivery.png",
      "public/orders/live-track/delivered.png",
    ],
  ),
  "empty-orders": U(
    `import { OrdersPageContent } from "@/components/orders/OrdersPageContent";

// Signed-in empty (mascot: public/orders/empty-orders-v2.png):
<OrdersPageContent orders={[]} previewSignedIn />`,
    [
      "src/app/(storefront)/orders/page.tsx",
      "src/components/orders/OrdersPageContent.tsx",
      "public/orders/empty-orders-v2.png",
    ],
  ),
  "orders-guest": U(
    `import { OrdersPageContent } from "@/components/orders/OrdersPageContent";

// Guest gate (playground force):
<OrdersPageContent previewSignedIn={false} />`,
    [
      "src/app/(storefront)/orders/page.tsx",
      "src/components/orders/OrdersPageContent.tsx",
      "public/orders/empty-orders-v2.png",
    ],
  ),
  "address-modal-shared": U(
    `import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";

// Phase C #31 — profile: manage list opens sheet (no /profile/addresses page)
<SavedAddressesManageList />

// Phase C #35 — checkout Edit must pass editId (not bare open)
<AddressBookSheet
  open={open}
  onOpenChange={setOpen}
  initialStep={hasAddress ? "details" : "map"}
  editId={hasAddress ? saved.id : null}
/>`,
    [
      "src/components/playground/PhaseCAddressModalDemo.tsx",
      "src/components/delivery/AddressBookSheet.tsx",
      "src/components/delivery/SavedAddressesManageList.tsx",
    ],
  ),
  "address-book": U(
    `import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";

<AddressBookSheet open={open} onOpenChange={setOpen} />`,
    ["src/components/delivery/AddressBookSheet.tsx"],
  ),
  "address-manage": U(
    `import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";

<SavedAddressesManageList />`,
    [
      "src/components/delivery/SavedAddressesManageList.tsx",
      "src/lib/saved-addresses.ts",
    ],
  ),
  "address-map": U(
    `import { AddressSearchField, AddressDetectButton } from "@/components/delivery/AddressLocationControls";

<AddressSearchField value={q} onChange={setQ} onSelectPlace={setPlace} />
<AddressDetectButton detecting={busy} onDetect={detect} />`,
    [
      "src/components/delivery/AddressLocationControls.tsx",
      "src/components/delivery/AddressMapStep.tsx",
    ],
  ),
  "address-details": U(
    `// Same Places suggestions + Detect on Location details
import { AddressDetailsStep } from "@/components/delivery/AddressDetailsStep";`,
    [
      "src/components/delivery/AddressLocationControls.tsx",
      "src/components/delivery/AddressDetailsStep.tsx",
    ],
  ),
  "wishlist-list": U(
    `import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";

<WishlistProvider previewSignedIn initialIds={["fr-1", "vg-1"]}>
  <WishlistPageContent />
</WishlistProvider>`,
    [
      "src/components/wishlist/WishlistPageContent.tsx",
      "src/components/wishlist/WishlistContext.tsx",
    ],
  ),
  "wishlist-guest-heart": U(
    `import { ProductCard } from "@/components/product/ProductCard";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";

// Guest hearts → /login (no previewSignedIn)
<WishlistProvider>
  <ProductCard product={product} />
</WishlistProvider>`,
    [
      "src/components/product/ProductCard.tsx",
      "src/components/wishlist/WishlistContext.tsx",
    ],
  ),
  skeletons: U(
    `import { Skeleton } from "@/components/ui/Skeleton";
import {
  HomeHeroSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ProductRailSkeleton,
  HomeShelfSkeleton,
  CategoriesHubSkeleton,
  CategoryPlpSkeleton,
  ProductDetailSkeleton,
  OrderDetailSkeleton,
  StorefrontPageSkeleton,
} from "@/components/ui/skeletons";

// Storefront:
// /home hero Suspense → <HomeHeroSkeleton /> (no Yaadro / default name flash)
// app/(storefront)/loading.tsx → <StorefrontPageSkeleton />
// product/[id] → <ProductDetailSkeleton />
// categories/[slug] → <CategoryPlpSkeleton /> (horizontal chrome)
// orders/[id] → <OrderDetailSkeleton />
// /categories Suspense → <CategoriesHubSkeleton /> (search + pill rail)`,
    ["src/components/ui/Skeleton.tsx", "src/components/ui/skeletons.tsx"],
  ),
  toasts: U(
    `import { showPopup } from "@/components/ui/Toast";
import { LOCATION_TOASTS } from "@/lib/location-messages";

// Island snackbars at the top — AppProviders mounts <ToastViewport />
showPopup("Saved to wishlist", "success");
showPopup("Code not found", "error");
showPopup("Promo removed", "info");
showPopup("Prices may vary on some products.", "warning");

// #26 location / delivery (playground lab; wire on checkout next)
showPopup(LOCATION_TOASTS.notServiceable.message, LOCATION_TOASTS.notServiceable.tone);
showPopup(LOCATION_TOASTS.allowLocation.message, LOCATION_TOASTS.allowLocation.tone);
showPopup(LOCATION_TOASTS.deliveringHere.message, LOCATION_TOASTS.deliveringHere.tone);`,
    [
      "src/components/ui/Toast.tsx",
      "src/components/playground/ToastDemo.tsx",
      "src/lib/location-messages.ts",
      "src/components/providers/AppProviders.tsx",
    ],
  ),
};

export function getPlaygroundUsage(slug: string): PlaygroundUsage | undefined {
  return PLAYGROUND_USAGE[slug];
}
