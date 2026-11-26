"use client";

import {
  ProfileOptionRow,
  ProfileOrdersIcon,
  type ProfileOptionIcon,
} from "@/components/profile/ProfileOptionRow";
import {
  PROFILE_OPTIONS,
  resolveProfileOption,
  type ProfileOptionId,
} from "@/lib/profile-options";

/** Brand assets (cart / coupons / help) + Lucide History for orders. */
const ICONS: Record<ProfileOptionId, ProfileOptionIcon> = {
  orders: ProfileOrdersIcon,
  wishlist: { kind: "image", src: "/icons/wishlist.svg", size: 20 },
  coupons: { kind: "image", src: "/icons/coupon.svg", size: 20 },
  addresses: { kind: "image", src: "/icons/location.svg", size: 20 },
  support: { kind: "image", src: "/icons/support.png", size: 24 },
};

/** Desk guest order: open tools first, then locked. */
const GUEST_ORDER: ProfileOptionId[] = [
  "wishlist",
  "support",
  "orders",
  "coupons",
];

const SIGNED_ORDER: ProfileOptionId[] = [
  "orders",
  "wishlist",
  "coupons",
  "support",
];

type ProfileOptionsListProps = {
  signedIn: boolean;
  /** When true, address is shown on the desk card — skip that row. */
  hideAddressRow?: boolean;
  onOpenAddresses?: () => void;
};

/** Desk-style stacked menu (shop desk profile). */
export function ProfileOptionsList({
  signedIn,
  hideAddressRow = true,
  onOpenAddresses,
}: ProfileOptionsListProps) {
  const order = signedIn ? SIGNED_ORDER : GUEST_ORDER;
  const byId = new Map(PROFILE_OPTIONS.map((o) => [o.id, o]));
  const rows = order
    .map((id) => byId.get(id))
    .filter((option): option is NonNullable<typeof option> => {
      if (!option) return false;
      if (hideAddressRow && option.id === "addresses") return false;
      return true;
    });

  return (
    <section>
      <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_24px_rgba(31,92,31,0.06)] ring-1 ring-black/[0.05]">
        {rows.map((option, i) => (
          <div
            key={option.id}
            className={i > 0 ? "border-t border-black/[0.05]" : undefined}
          >
            <ProfileOptionRow
              label={option.label}
              description={option.description}
              guestDescription={option.guestDescription}
              guestTrailing={option.guestTrailing}
              icon={ICONS[option.id]}
              target={resolveProfileOption(option, signedIn)}
              onSheet={
                option.id === "addresses" ? onOpenAddresses : undefined
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
