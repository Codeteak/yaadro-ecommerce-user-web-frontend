"use client";

import Image from "next/image";
import Link from "next/link";
import { GUEST_PROFILE_AVATAR } from "@/lib/default-profile-avatar";
import { loginHref } from "@/lib/profile-options";
import {
  primaryButton,
  profileCard,
  profileSectionTitle,
} from "@/components/profile/profile-styles";

/** Guest identity: invite to sign in; wishlist stays available below. */
export function ProfileGuestCard() {
  return (
    <section>
      <h2 className={profileSectionTitle}>Account</h2>
      <div className={`mt-3 ${profileCard} flex flex-col items-center px-5 py-6 text-center`}>
        <Image
          src={GUEST_PROFILE_AVATAR}
          alt=""
          width={96}
          height={96}
          unoptimized
          className="size-24 rounded-full object-cover ring-1 ring-leaf/15"
        />
        <p className="mt-4 text-base font-extrabold text-black">Guest</p>
        <p className="mt-1 max-w-[260px] text-[13px] leading-5 text-muted">
          Sign in to see orders, coupons, and your delivery address.
        </p>
        <Link
          href={loginHref("/profile")}
          className={`${primaryButton} mt-5 px-8`}
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
