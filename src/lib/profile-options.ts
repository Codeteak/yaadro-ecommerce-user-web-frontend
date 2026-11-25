/**
 * Profile menu — one list drives every row so order, labels and the
 * guest rule live in a single place.
 */

export type ProfileOptionId =
  | "orders"
  | "wishlist"
  | "coupons"
  | "addresses"
  | "support";

export type ProfileOption = {
  id: ProfileOptionId;
  label: string;
  description: string;
  /** Guest subtitle when `requiresAuth` (falls back to a generic line). */
  guestDescription?: string;
  /**
   * Guest trailing control: gray non-clickable Sign in pill (row still links
   * to login). Default chevron/lock treatment when omitted.
   */
  guestTrailing?: "sign-in-pill";
  /** Link target; `addresses` opens a sheet instead. */
  href: string | null;
  /** Guests are sent to login first. */
  requiresAuth: boolean;
};

export const PROFILE_OPTIONS: readonly ProfileOption[] = [
  {
    id: "orders",
    label: "Order history",
    description: "Track and reorder past orders",
    guestDescription: "Sign in to see your order history",
    guestTrailing: "sign-in-pill",
    href: "/orders",
    requiresAuth: true,
  },
  {
    id: "wishlist",
    label: "Wishlist",
    description: "Items you saved for later",
    href: "/wishlist",
    requiresAuth: false,
  },
  {
    id: "coupons",
    label: "Coupons",
    description: "Offers you can use at checkout",
    guestDescription: "Sign in to see your coupons",
    guestTrailing: "sign-in-pill",
    href: "/coupons",
    requiresAuth: true,
  },
  {
    id: "addresses",
    label: "Saved addresses",
    description: "Delivery address for home and checkout",
    guestDescription: "Sign in to save an address",
    href: null,
    requiresAuth: true,
  },
  {
    id: "support",
    label: "Help & support",
    description: "FAQs and contact the shop",
    href: "/profile/support",
    requiresAuth: false,
  },
];

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

export type ProfileOptionTarget =
  | { kind: "link"; href: string }
  | { kind: "sheet" }
  | { kind: "login"; href: string };

/** Where a tap on the row should go for this shopper. */
export function resolveProfileOption(
  option: ProfileOption,
  signedIn: boolean,
): ProfileOptionTarget {
  if (option.requiresAuth && !signedIn) {
    return {
      kind: "login",
      href: loginHref(option.href ?? "/profile?address=1"),
    };
  }
  if (option.href == null) return { kind: "sheet" };
  return { kind: "link", href: option.href };
}
