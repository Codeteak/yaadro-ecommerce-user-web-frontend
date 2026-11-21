# Multi-phone layout plan

**Owner:** Fayad / storefront UI  
**Status:** In progress (Phase B + C started)  
**Audience:** Any developer touching storefront layout, scroll shells, or product cards.  
**Playground:** `/playground/multi-phone-layout`

## Why this exists

UI was largely tuned on **iPhone 16 Pro Max–class** viewports. On shorter/narrower phones (e.g. **iPhone SE**) and varied Android sizes, the same layout shows discomfort and bugs. This doc is the shared plan so everyone knows what we are fixing and how to verify.

## Goal

One storefront UI that stays readable and usable across common phones — not a Pro Max–only layout — without separate designs per device.

### Primary QA band

| Tier | Approx CSS px | Examples |
|------|----------------|----------|
| Floor (must pass) | ~360×640 – 375×667 | iPhone SE, small Android |
| Common | ~390×844 | iPhone 14/15/16 |
| Ceiling | ~430×932 | iPhone 16 Pro Max |

Tablets / desktop can stay `max-w-lg` centered; the phone band is the priority.

## Problems observed

### 1. Product cards feel “taller” on SE

- Photo uses `aspect-square` (width-driven).
- Name / unit / price / add use relatively fixed heights.
- On a **narrow** screen the image shrinks; chrome below does not → the card’s overall shape feels taller; fewer rows fit on a **short** screen.

### 2. Profile on SE: content cut off / can’t scroll

- On Pro Max–height, profile fits with spare space (footer visible).
- On SE, quick actions + Help sit against the bottom nav; brand footer may be below the fold.
- Expected: page scrolls so footer and nav clearance stay reachable.
- Cause addressed: document scroll was unreliable on short shells; profile now uses a **fill height + inner overflow-y-auto** scrollport (same idea as categories).

### 3. Unknowns (expect more)

Other screens that use `h-dvh` + `overflow-hidden`, fixed heights, or large vertical padding may fail the same way on short/wide Android devices. Discover via the checklist — do not guess.

## Principles

1. **Design against the floor, polish on the ceiling** — if SE works, Pro Max usually still looks fine.
2. **One layout system** — fluid type/spacing (`clamp` where useful), not three separate UIs.
3. **Media vs chrome** — keep images aspect-ratio based; avoid stacking many large fixed-height controls under them without a small-screen density pass.
4. **Scrollport discipline** — either document scroll *or* one nested `overflow-y-auto` with a real `min-h-0` flex height chain (same lesson as categories). Never lock `overflow-hidden` on a full-viewport shell unless the inner pane is proven scrollable on SE.
5. **Bottom nav** — always leave safe padding so last content is not trapped under the pill.

## Fix plan (phased)

Legend: ★ = done in code · ☐ = still open · ◐ = partial

### Phase A — Diagnose & document

- ★ Capture SE vs Pro Max examples (product grid, profile).
- ★ Reproduce profile scroll on SE (DevTools ~375×667).
- ★ Note scroll root: profile now uses nested `overflow-y-auto` on `ProfilePullContent` (not window).
- ★ Plan doc at repo root: `MULTI_PHONE_LAYOUT_PLAN.md`.

### Phase B — Profile scroll (P0)

- ★ Ensure `/profile` content can scroll on ~375×667 (`data-storefront-fill` + calc height under nav).
- ★ Brand footer inside the scroll pane (reachable above bottom nav).
- ★ PullToRefresh wraps the scrollport (`className` on `ProfilePullContent`).
- ★ Short-viewport density: tighter hero / quick actions / nav spacing (`max-[700px]:…`).
- ★ Soften resting clip: bottom fade + extra footer padding (no mid-card hard cut).
- ★ Playground demo: `/playground/multi-phone-layout` (SE-height profile frame).
- ★ Scroll-stuck polish (all routes): PTR commits later / less preventDefault; shell `overscroll-y-none` only on fill pages.
- ★ PTR passive-only (no `preventDefault`) — scroll always wins; playground note updated.
- ☐ Verify on a real SE / small Android device (manual).
- ☐ Re-verify Pro Max after real-device pass.

### Phase C — Product card density (P1)

- ★ Review `ProductCard` non-compact on max-width ≤390px.
- ★ Narrow phones: photo `aspect-[5/4]`, slightly smaller add / qty control.
- ★ Playground narrow card strip in `/playground/multi-phone-layout`.
- ☐ Re-check home shelves + `/categories` grid on real devices.
- ☐ Optional further type/padding tweaks if still heavy.

### Phase D — Responsive QA sweep (P1)

Run on **SE**, **common iPhone**, **Pro Max**, **one wide Android**:

- ☐ `/home` — search gateway, banners, category rail, product grid
- ☐ `/categories` — sticky rail, header/search leave/return, product scroll
- ☐ `/categories/[slug]` — same
- ◐ `/profile` — scroll + quick actions + Help + footer (code done; real-device ☐)
- ☐ `/wishlist`, `/orders`, `/cart`, `/checkout`
- ☐ Login / address sheet (keyboard open on short screens)

### Phase E — Guardrails for other developers

- ★ Document QA band + principles in this file.
- ★ Playground section named **Multi-phone layout (SE)**.
- ☐ Prefer this QA band before merging UI-heavy PRs (team habit).
- ☐ Avoid new `h-dvh` + `overflow-hidden` without an SE scroll test.
- ☐ Log further responsive fixes in `docs/IMPLEMENTATION_LOG.md`.

## Out of scope (for now)

- Full tablet/desktop redesign
- Separate Android-only skins
- Changing business logic / API contracts

## Related code (starting points)

- Product card: `src/components/product/ProductCard.tsx` (`aspect-square` → `max-[390px]:aspect-[5/4]`)
- Profile: `src/app/(storefront)/profile/page.tsx`, `ProfilePullContent`, `StorefrontChrome` bottom padding
- Categories scroll shell: `CategoriesPageContent` / `data-storefront-fill` (reference for correct fill + scroll)
- Chrome: `src/components/storefront/StorefrontChrome.tsx`
- Playground: `/playground/multi-phone-layout`

## How other developers should use this

1. Before UI PRs: skim **Principles** and run **Phase D** on at least SE + one large phone.
2. When fixing: mark ★ / ☐ here and add a short note to `docs/IMPLEMENTATION_LOG.md`.
3. When unsure: prefer scroll + density fixes over device-specific forks.
4. Open `/playground/multi-phone-layout` to see the SE profile scroll shell and narrow cards.

## Success criteria

- SE: profile scrolls; footer and Help are reachable; bottom nav does not cover actions. ★ (code) · ☐ (device)
- SE: product cards look balanced (not awkwardly text-heavy / oversized). ◐
- Pro Max: no major regression (no huge empty awkward gaps beyond existing design). ☐
- Same checklist passes on at least one Android width. ☐
