# Yaadro E-Commerce User Frontend – Working Document

## Project Overview

**Project name:** Yaadro – Professional Supermarket E-Commerce (User Web Frontend)  
**Repository:** [yaadro-ecommerce-user-web-frontend](https://github.com/Codeteak/yaadro-ecommerce-user-web-frontend)  
**Framework:** Next.js 14 (App Router)  
**Language:** JavaScript  
**Styling:** Tailwind CSS  
**State:** React Context API + TanStack React Query where applicable  

This is the customer-facing web app for the Yaadro supermarket e-commerce platform. It supports browsing products, cart, checkout, orders, profile, addresses, wishlist, and auth flows backed by APIs where configured.

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| Framework   | Next.js 14.x (App Router) |
| UI          | React 18, Tailwind CSS |
| Icons       | lucide-react |
| Data/API    | TanStack React Query, custom API client (`utils/apiClient.js`) |
| Payments    | Razorpay (checkout) |
| State       | React Context (Cart, Auth, Address, Order, Wishlist, Toast, Alert, Layout heights, Bottom nav visibility, etc.) |

---

## Project Structure

```
ecommerce-user/
├── app/                          # Next.js App Router pages
│   ├── layout.js                 # Root layout, providers, ConditionalLayout
│   ├── page.js                   # Home (banner, categories, products)
│   ├── globals.css               # Global + Tailwind styles
│   ├── not-found.js              # 404
│   ├── addresses/page.js         # Saved addresses list
│   ├── auth/verify-link/         # Email/auth verification
│   ├── cart/page.js              # Cart page
│   ├── categories/page.js        # Category tree (expandable)
│   ├── checkout/page.js          # Checkout flow
│   ├── new/page.js               # “New” products (bottom nav)
│   ├── order-success/page.js     # Order confirmation + bill preview
│   ├── orders/
│   │   ├── page.js               # Orders list
│   │   └── [id]/page.js          # Order details
│   ├── products/
│   │   ├── page.js               # Product listing (filters, search)
│   │   └── [id]/page.js          # Product detail
│   ├── profile/page.js           # Profile + tabs (e.g. addresses)
│   ├── settings/page.js          # Settings (profile card, wallet, links)
│   ├── trending/page.js         # Trending (bottom nav)
│   └── wishlist/page.js         # Wishlist
├── components/
│   ├── Navbar.jsx                # Top nav: delivery, address, search, promo, categories
│   ├── Footer.jsx                # Footer (hidden on mobile)
│   ├── ConditionalLayout.jsx     # Shows/hides Navbar+Footer per route; main padding from layout heights
│   ├── MobileBottomNav.jsx       # Bottom nav (Home, Categories, Trending, New)
│   ├── CartFAB.jsx               # Floating cart button (scroll-aware)
│   ├── CartSidebar.jsx           # Cart drawer/sidebar
│   ├── MobileCartSheetWrapper.jsx
│   ├── CartNotification.jsx
│   ├── PageTopBar.jsx            # Back + title for full-screen pages
│   ├── AlertModal.jsx, ConfirmModal.jsx, PromptModal.jsx
│   ├── BillPreviewSheet.jsx      # Bill preview on order success
│   ├── CategoryIcon.jsx, CategoryTreeItem.jsx
│   ├── CheckoutAddAddressSheet.jsx, CheckoutBottomSheet.jsx
│   ├── LoginBottomSheet.jsx, LoginBottomSheetWrapper.jsx
│   ├── ProductCard, ProductGrid, ProductFilters, ProductSort, ProductComparison
│   ├── BannerCarousel, CategoryCard, CategoryGrid
│   ├── Container, Breadcrumbs, QueryProvider
│   └── …
├── context/
│   ├── AuthContext.jsx
│   ├── CartContext.jsx
│   ├── AddressContext.jsx
│   ├── OrderContext.jsx
│   ├── WishlistContext.jsx
│   ├── ToastContext.jsx
│   ├── AlertContext.jsx
│   ├── LayoutHeightsContext.jsx  # Navbar + bottom nav heights for main padding
│   ├── BottomNavVisibilityContext.jsx  # Scroll hide/show bottom nav
│   ├── ActivityLogContext.jsx
│   ├── RecentlyViewedContext.jsx
│   └── ProductComparisonContext.jsx
├── hooks/
│   ├── useProducts.js            # Products + categories tree + search
│   ├── useAuth.js
│   ├── useAddresses.js
│   ├── useCart.js
│   └── useOrders.js
├── utils/
│   ├── apiClient.js             # Base API client
│   ├── productApi.js             # Products/categories API + transforms
│   ├── authApi.js
│   ├── addressApi.js
│   ├── cartApi.js
│   ├── orderApi.js
│   └── productUtils.js
├── public/                      # Static assets (images, gifs, manifest)
├── package.json
├── next.config.js
├── tailwind.config.js            # Primary theme #FF8D21
├── postcss.config.js
├── README.md
└── working_doc.md               # This file
```

---

## Key Features

- **Home:** Banner carousel, category grid (scrollable), product sections.
- **Navbar:** Delivery time + address, profile/cart, search with dropdown, promo tile, category icons (collapse to text on scroll); height reported to layout for content padding.
- **Layout:** Dynamic top padding (navbar height) and bottom padding (mobile bottom nav when visible); footer hidden on mobile.
- **Products:** Listing with filters/sort/search; detail page with full info, variants, “Frequently Bought Together”, share.
- **Cart:** Sidebar + FAB; FAB position adapts when bottom nav is visible/hidden.
- **Checkout:** Address selection, bottom sheet flows, Razorpay integration.
- **Orders:** List and detail with status, actions, “Related items” carousel; bill preview on order success.
- **Profile / Settings / Addresses:** Dedicated pages with conditional layout (no navbar/footer on some routes); PageTopBar for back + title.
- **Auth:** Login bottom sheet; verify-link flow.
- **Modals:** Custom Alert/Confirm/Prompt via AlertContext (no `alert`/`confirm`).
- **Category tree:** Categories page uses tree API and expandable CategoryTreeItem.
- **Theme:** Primary orange `#FF8D21` (Tailwind `primary`), PWA/manifest and Razorpay theme aligned.

---

## Routes Summary

| Route | Description |
|-------|-------------|
| `/` | Home |
| `/products` | Product listing (search, category, filters, sort) |
| `/products/[id]` | Product detail |
| `/cart` | Cart page |
| `/checkout` | Checkout |
| `/order-success` | Order confirmation + bill preview |
| `/orders` | Orders list |
| `/orders/[id]` | Order detail |
| `/profile` | Profile (tabs e.g. addresses) |
| `/addresses` | Saved addresses |
| `/settings` | Settings |
| `/wishlist` | Wishlist |
| `/categories` | Category tree |
| `/trending` | Trending (placeholder) |
| `/new` | New (placeholder) |
| `/auth/verify-link` | Auth verification |

Routes like `/profile`, `/cart`, `/orders`, `/checkout`, `/order-success`, `/settings`, `/addresses` use ConditionalLayout to hide the main Navbar/Footer and show PageTopBar where applicable.

---

## Environment & Scripts

- **Env:** Copy `.env.example` to `.env` and set `NEXT_PUBLIC_*` and API base URL as per backend.
- **Scripts:** `npm run dev` (dev), `npm run build` (build), `npm start` (production), `npm run lint` (lint).

---

## Layout & UX Notes

- **Navbar:** Fixed top; ResizeObserver reports height to LayoutHeightsContext; main content uses that for `paddingTop`.
- **Mobile bottom nav:** Fixed bottom; scroll-based show/hide; height reported to layout for `paddingBottom` on mobile only.
- **Footer:** Rendered only when layout is visible and **not** on mobile (`!isMobile` in ConditionalLayout).
- **Category row (navbar):** On scroll, only category icons collapse; labels and spacing shrink; search bar stays.

---

*Last updated: project working document for Yaadro e-commerce user frontend.*
