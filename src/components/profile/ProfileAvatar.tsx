"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { pickDefaultProfileAvatar } from "@/lib/default-profile-avatar";

type ProfileAvatarProps = {
  name?: string | null | undefined;
  /** Stable seed (prefer user id) so the same person keeps the same cartoon. */
  seed?: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
};

const SIZE = {
  sm: "size-11",
  md: "size-16",
} as const;

/**
 * Signed-in avatar: default cartoon from the avatar pack.
 * Seeded by user id (or name) so it stays stable across visits.
 */
export function ProfileAvatar({
  name,
  seed,
  size = "md",
  className,
}: ProfileAvatarProps) {
  const src = pickDefaultProfileAvatar(
    String(seed || name || "yaadro-profile").trim() || "yaadro-profile",
  );

  return (
    <Image
      src={src}
      alt=""
      width={size === "md" ? 64 : 44}
      height={size === "md" ? 64 : 44}
      unoptimized
      aria-hidden
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-forest/10",
        SIZE[size],
        className,
      )}
    />
  );
}
