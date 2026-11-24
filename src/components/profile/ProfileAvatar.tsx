"use client";

import { cn } from "@/lib/cn";
import { profileInitials } from "@/lib/profile-initials";

type ProfileAvatarProps = {
  name: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
};

const SIZE = {
  sm: "size-11 text-sm",
  md: "size-16 text-lg",
} as const;

/**
 * Signed-in avatar: mint circle + initials.
 * Matches cart/checkout mint plates — no cartoon pack.
 */
export function ProfileAvatar({
  name,
  size = "md",
  className,
}: ProfileAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-mint font-extrabold tracking-tight text-forest ring-1 ring-forest/10",
        SIZE[size],
        className,
      )}
    >
      {profileInitials(name)}
    </span>
  );
}
