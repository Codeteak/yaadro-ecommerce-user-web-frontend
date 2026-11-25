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
import {
  profileCard,
  profileSectionTitle,
} from "@/components/profile/profile-styles";

/** Brand assets (cart / coupons / help) + Lucide History for orders. */
const ICONS: Record<ProfileOptionId, ProfileOptionIcon> = {
  orders: ProfileOrdersIcon,
  wishlist: { kind: "image", src: "/icons/wishlist.svg", size: 22 },
  coupons: { kind: "image", src: "/icons/coupon.svg", size: 22 },
  addresses: { kind: "image", src: "/icons/location.svg", size: 22 },
  support: { kind: "image", src: "/icons/support.png", size: 26 },
};

type ProfileOptionsListProps = {
  signedIn: boolean;
  /** When true, address is shown as its own card above — skip that row. */
  hideAddressRow?: boolean;
  onOpenAddresses?: () => void;
};

/** Stacked Wishlist / Coupons / Orders / Help (+ optional address). */
export function ProfileOptionsList({
  signedIn,
  hideAddressRow = true,
  onOpenAddresses,
}: ProfileOptionsListProps) {
  const rows = PROFILE_OPTIONS.filter(
    (option) => !(hideAddressRow && option.id === "addresses"),
  );

  return (
    <section>
      <h2 className={profileSectionTitle}>More</h2>
      <div className={`mt-3 ${profileCard} divide-y divide-forest/8 overflow-hidden`}>
        {rows.map((option) => (
          <ProfileOptionRow
            key={option.id}
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
        ))}
      </div>
    </section>
  );
}
