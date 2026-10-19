# Implementation Log

## 2026-10-19 — Onboarding home-login UI

### What was built

- `/` onboarding screen: leaf logo, split headline, tote hero, single slide indicator, swipe-to-login, continue without login
- `/login` style-matched empty stub
- `/home` guest “storefront coming soon” stub
- Design tokens updated for paper / leaf / forest palette

### Files

| Path | Change |
|------|--------|
| `src/app/page.tsx` | Onboarding entry |
| `src/app/layout.tsx` | Metadata / theme color |
| `src/app/globals.css` | Tokens + light motion |
| `src/app/login/page.tsx` | Login stub |
| `src/app/home/page.tsx` | Guest home stub |
| `src/components/onboarding/OnboardingScreen.tsx` | Layout |
| `src/components/onboarding/SwipeToLogin.tsx` | Drag / keyboard CTA |
| `public/onboarding/*` | Hero, leaf, cart assets |
| `docs/PROJECT_STATUS.md` | Status baseline |
| `docs/IMPLEMENTATION_LOG.md` | This log |

### Verification

- `npm run lint` — pass
- `npm run build` — pass (Next.js 16.4.2); routes `/`, `/login`, `/home`, `/manifest.webmanifest`

### Next

- Confirm auth API contract
- Replace generated hero with final photography if provided
- Implement real login form on `/login`

## 2026-10-19 — Exact onboarding visual match

### What changed

- Replaced generated tote hero with a crop from the provided Dribbble/reference mock (`image-6e907ba3…jpg` → `public/onboarding/tote-hero.jpg`)
- Rebuilt `/` as a centered mobile composition (no two-column desktop split)
- Headline: forest “Fresh Groceries,” + bright green “Right at Your Door” on two lines
- Three static pagination dots; green cart icon; white track arrow; organic corner washes + floating leaf accents
- Tokens aligned to mock greens (`#064E3B`, `#22C55E`, pale mint paper)

### Verification

- `npm run lint` — pass
- `npm run build` — pass

### Note

- Hero is cropped from the phone mock (bezel/UI chrome excluded). An official isolated export can replace `public/onboarding/tote-hero.jpg` without code changes.

## 2026-10-19 — Onboarding polish (transparent hero, swipe reset, scale)

### What changed

- Converted hero to `public/onboarding/tote-hero.png` with mint/white page fill keyed to alpha (no opaque rectangle)
- Removed CSS mint underlay circle under the hero
- `SwipeToLogin` resets on mount / pathname / `pageshow` (bfcache) so Back no longer leaves the handle stuck
- Larger headline (`2.25rem` / `2.6rem`) and hero (`max-w` 26–28rem)

### Verification

- `npm run lint` — pass
- `npm run build` — pass
- `tote-hero.png` confirmed `hasAlpha: true`

## 2026-10-19 — Fix hero checkerboard / side bars

### Cause

`tote-hero.png` had a **baked-in gray/white checkerboard** (export artifact), not real transparency — that read as side bars / a changed framed look.

### Fix

- Flood-cleared checker tiles to alpha, trimmed bounds (`1068×942`)
- Soft mint circular glow behind the cutout; `unoptimized` Image to preserve PNG alpha

## 2026-10-19 — Motion polish (verified, swipe, hero, corners)

### What changed

- Stronger organic green accents top-left / bottom-right (`GreenCornerAccents`)
- Larger floating tote hero (`onboarding-hero-float`)
- Swipe idle hint, progress fill, complete pulse
- OTP success → Verified check animation → `/home`
- `prefers-reduced-motion` disables looping motion

### Verification

- `npm run lint` — pass
- `npm run build` — pass

## 2026-10-19 — Login UI (phone + 4-digit OTP)

### What was built

- `/login` phone step: India flag + `+91`, 10-digit validation, placeholder `98****6789`
- OTP step: 4 highlighted digit boxes, paste/autofill, resend / change number
- Verify navigates to `/home` (UI stub — no auth API yet)

### Files

| Path | Role |
|------|------|
| `src/app/login/page.tsx` | Login shell |
| `src/features/auth/LoginForm.tsx` | Phone → OTP flow |
| `src/features/auth/PhoneInput.tsx` | +91 input |
| `src/features/auth/OtpInput.tsx` | 4-box OTP |
| `src/lib/validations/auth.ts` | Zod phone/OTP |
| `src/lib/cn.ts` | className helper |

### Verification

- `npm run lint` — pass
- `npm run build` — pass

### Next

- Wire `requestOtp` / `verifyOtp` API + session tokens

## 2026-10-19 — Use corrected tote-hero.png

### What changed

- Adopted user-supplied `public/onboarding/tote-hero.png` (1536×1024, alpha)
- Cleared residual opaque black fringe pixels to full transparency
- Updated `OnboardingScreen` image dimensions and slightly larger hero `max-w` (28–32rem)

## 2026-10-19 — Floating storefront bottom nav

### What changed

- Added floating pill `BottomNav` (Home, Categories, Wishlist, Profile) matching reference: active forest pill with icon+label, inactive outline icons only
- Introduced `(storefront)` route group layout with safe-area bottom padding
- Moved `/home` into the group; added stub `/categories`, `/wishlist`, `/profile`

### Verification

- `npx next build` — pass; routes include `/home`, `/categories`, `/wishlist`, `/profile`

## 2026-10-19 — Login bottom sheet over shared hero

### What changed

- Swipe-to-login opens a bottom sheet instead of a hard page swap; tote hero stays mounted
- `LoginSheet` slides up with `LoginForm`; Back / Escape / history dismisses
- `/login` deep links render the same `OnboardingScreen` with sheet open initially
- URL sync via `history.pushState` / `replaceState` so the hero is not remounted on swipe

### Verification

- `npx next build` — pass
