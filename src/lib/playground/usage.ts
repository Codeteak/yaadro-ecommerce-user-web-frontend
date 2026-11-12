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
<HomeTopBar shopName="Yaadro" shopImage="/onboarding/brand-mark-white-y.svg" signedIn />`,
    [
      "src/components/home/HomeTopBar.tsx",
      "public/icons/profile-signed-in.svg",
    ],
  ),
  search: U(
    `import { HomeSearchBar } from "@/components/home/HomeSearchBar";

<HomeSearchBar
  activateHref="/categories?focus=search"
  filterHref="/categories?focus=search&chips=1"
/>`,
    ["src/components/home/HomeSearchBar.tsx"],
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
  "category-browser": U(
    `import { CategoryBrowser } from "@/components/categories/CategoryBrowser";

<CategoryBrowser branches={branches} products={products} />
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

{/* Shared PlpFilterChips + CategoryTile size="sidebar" */}
<CategoryListing slug="vegetables" backHref="/categories" />
// Filter / Brands / Type / Sort → PlpFilterSheets`,
    [
      "src/components/categories/CategoryListing.tsx",
      "src/components/categories/PlpFilterChips.tsx",
      "src/components/home/CategoryTile.tsx",
      "src/components/categories/PlpFilterSheets.tsx",
      "src/lib/plp-filters.ts",
      "src/lib/catalog-taxonomy.ts",
    ],
  ),
  "category-rail": U(
    `import { CategoryRail } from "@/components/home/CategoryRail";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";

<HomeCategoryProvider>
  <CategoryRail />
</HomeCategoryProvider>`,
    [
      "src/components/home/CategoryRail.tsx",
      "src/components/home/HomeCategoryContext.tsx",
      "src/lib/home-categories.ts",
    ],
  ),
  "offer-banners": U(
    `import { OfferBanners } from "@/components/home/OfferBanners";

<OfferBanners />`,
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

{/* Default — 3:2 denser photo (home / PLP / playground) */}
<ProductCard product={SAMPLE_PRODUCTS[0]} />
{/* Compact — cart “Add more” rail */}
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

<ViewCartBar />
// Needs CartProvider with items`,
    ["src/components/cart/ViewCartBar.tsx"],
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

// Storefront /cart (and playground) — suggestions + Add more under cart lines
<CartPageContent
  showPriceMayVary
  showCartSuggestions
  couponPickerHref="/coupons?from=cart"
/>`,
    [
      "src/app/(storefront)/cart/page.tsx",
      "src/components/cart/CartPageContent.tsx",
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

<ProductDetail product={getSampleProduct("vg-3")!} backHref="/home" />`,
    ["src/components/product/ProductDetail.tsx"],
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
    `// Full login flow UI — see /login page composition
// Phone → OTP → VerifiedSuccess`,
    ["src/app/login/page.tsx", "src/features/auth/"],
  ),
  "verified-success": U(
    `import { VerifiedSuccess } from "@/features/auth/VerifiedSuccess";

<VerifiedSuccess />`,
    ["src/features/auth/VerifiedSuccess.tsx"],
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

<CouponsPageContent />`,
    ["src/components/coupons/CouponsPageContent.tsx"],
  ),
  "coupons-empty": U(
    `import { CouponsPageContent } from "@/components/coupons/CouponsPageContent";

// Empty list:
<CouponsPageContent coupons={[]} />`,
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
  "profile-header": U(
    `import { ProfileHero } from "@/components/profile/ProfileHero";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { pickDefaultProfileAvatar } from "@/lib/default-profile-avatar";

<ProfileHero />
{/* Falls back to "{shopName} Member" until auth provides a real name */}
<ShopNameProvider name="Green Basket">
  <ProfileHero signedIn userId="user-123" />
</ShopNameProvider>
<ProfileHero signedIn userId="user-123" displayName="Priya Nair" />`,
    [
      "src/components/profile/ProfileHero.tsx",
      "src/components/shop/ShopNameProvider.tsx",
      "src/lib/default-profile-avatar.ts",
      "public/avatars/",
    ],
  ),
  checkout: U(
    `import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

<CheckoutPageContent showPriceMayVary />`,
    [
      "src/components/checkout/CheckoutPageContent.tsx",
      "src/components/storefront/PriceMayVaryNotice.tsx",
    ],
  ),
  "orders-list": U(
    `import { OrdersListPlayground } from "@/components/orders/OrdersListPlayground";

// Storefront /orders
<OrdersListPlayground />`,
    [
      "src/app/(storefront)/orders/page.tsx",
      "src/components/orders/OrdersListPlayground.tsx",
      "src/components/orders/lead-order-shared.tsx",
    ],
  ),
  "order-detail": U(
    `import { OrderDetailPlayground } from "@/components/orders/OrderDetailPlayground";

// Storefront /orders/[id]
<OrderDetailPlayground orderId="ord-1042" backHref="/orders" shopHref="/home" />`,
    [
      "src/app/(storefront)/orders/[id]/page.tsx",
      "src/components/orders/OrderDetailPlayground.tsx",
      "src/components/orders/lead-order-shared.tsx",
    ],
  ),
  "empty-orders": U(
    `import { OrdersListPlayground } from "@/components/orders/OrdersListPlayground";

<OrdersListPlayground orders={[]} />`,
    [
      "src/app/(storefront)/orders/page.tsx",
      "src/components/orders/OrdersListPlayground.tsx",
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
    `// Map pin / location picker — see AddressBookSheet map step
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";`,
    ["src/components/delivery/AddressBookSheet.tsx"],
  ),
  "address-details": U(
    `// Address form details step — see AddressBookSheet
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";`,
    ["src/components/delivery/AddressBookSheet.tsx"],
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
// app/(storefront)/loading.tsx → <StorefrontPageSkeleton />
// product/[id] → <ProductDetailSkeleton />
// categories/[slug] → <CategoryPlpSkeleton />
// orders/[id] → <OrderDetailSkeleton />
// /categories hub Suspense → <CategoriesHubSkeleton />`,
    ["src/components/ui/Skeleton.tsx", "src/components/ui/skeletons.tsx"],
  ),
  toasts: U(
    `// Planned — toast / snackbar system
// Add when implementing toast components.`,
  ),
};

export function getPlaygroundUsage(slug: string): PlaygroundUsage | undefined {
  return PLAYGROUND_USAGE[slug];
}
