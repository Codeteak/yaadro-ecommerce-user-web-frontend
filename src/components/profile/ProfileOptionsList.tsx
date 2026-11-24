"use client";

import {
  Heart,
  Headset,
  History,
  MapPin,
  TicketPercent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProfileOptionRow } from "@/components/profile/ProfileOptionRow";
import {
  PROFILE_OPTIONS,
  resolveProfileOption,
  type ProfileOptionId,
} from "@/lib/profile-options";
import {
  profileCard,
  profileSectionTitle,
} from "@/components/profile/profile-styles";

const ICONS: Record<ProfileOptionId, LucideIcon> = {
  orders: History,
  wishlist: Heart,
  coupons: TicketPercent,
  addresses: MapPin,
  support: Headset,
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
