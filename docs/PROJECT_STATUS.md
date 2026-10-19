# Yaadro Storefront — Project Status

**Branch:** `fayad`  
**Updated:** 2026-10-19

## Current stage

Greenfield Next.js 16 / TypeScript / Tailwind 4 rewrite. Onboarding UI and route stubs are in place; authentication API and catalog are not implemented.

## Implemented

| Area | Status | Notes |
|------|--------|--------|
| Onboarding `/` | Done | Matches home-login mock: hero, swipe CTA, guest link |
| Login `/login` | UI done | Phone +91 / 4-digit OTP boxes; API pending |
| Guest home `/home` | Stub | “Storefront coming soon” + floating bottom nav |
| Categories / Wishlist / Profile | Stub | Placeholder pages under storefront layout |
| Bottom nav | Done | Floating pill: Home, Categories, Wishlist, Profile |
| PWA manifest / icons | Partial | Manifest + icons exist; Serwist SW not wired |
| Auth / session | Missing | No tokens, providers, or API client |
| Catalog / cart / checkout | Missing | — |

## Routes

- `/` — onboarding / swipe to login
- `/login` — login stub
- `/home` — guest storefront stub
- `/categories` — categories stub
- `/wishlist` — wishlist stub
- `/profile` — profile stub
- `/manifest.webmanifest` — generated from `src/app/manifest.ts`

## Known limitations

- Hero image is `public/onboarding/image-hero.png`.
- Cart and leaf icons are SVG approximations of the design.
- No auth backend integration.
- Serwist packages installed but not configured.
