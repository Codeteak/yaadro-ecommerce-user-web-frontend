"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProfileOptionTarget } from "@/lib/profile-options";

export type ProfileOptionIcon =
  | { kind: "lucide"; Icon: LucideIcon; className?: string }
  | { kind: "image"; src: string; size?: number };

type ProfileOptionRowProps = {
  label: string;
  description: string;
  /** Guest subtitle when the row redirects to login (unused when desk chip). */
  guestDescription?: string;
  icon: ProfileOptionIcon;
  target: ProfileOptionTarget;
  /** Desk-style Sign in chip for guest auth rows. */
  guestTrailing?: "sign-in-pill";
  onSheet?: () => void;
};

function OptionIcon({ icon }: { icon: ProfileOptionIcon }) {
  if (icon.kind === "image") {
    const size = icon.size ?? 22;
    return (
      <Image
        src={icon.src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const Icon = icon.Icon;
  return (
    <Icon
      aria-hidden
      className={cn("size-5 text-[#1F1C18]", icon.className)}
      strokeWidth={1.9}
    />
  );
}

/**
 * Desk menu row — link, login redirect, or sheet trigger.
 * Locked rows still navigate to login so guests can finish the action.
 */
export function ProfileOptionRow({
  label,
  description,
  guestDescription,
  icon,
  target,
  guestTrailing,
  onSheet,
}: ProfileOptionRowProps) {
  const locked = target.kind === "login";
  const showSignInChip = locked && guestTrailing === "sign-in-pill";
  const subtitle =
    locked && !showSignInChip && guestDescription
      ? guestDescription
      : locked && !showSignInChip
        ? "Sign in to use this"
        : description;

  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#F0F4F0]">
        <OptionIcon icon={icon} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-black">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-4 text-muted">
          {subtitle}
        </span>
      </span>
      {showSignInChip ? (
        <span
          aria-hidden
          className="rounded-full bg-black/[0.05] px-2 py-1 text-[10px] font-bold tracking-wide text-muted uppercase"
        >
          Sign in
        </span>
      ) : (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted/80"
          strokeWidth={1.85}
        />
      )}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 px-3.5 py-3.5 transition",
    "hover:bg-[#F0F4F0]/70 active:bg-[#F0F4F0]",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-leaf",
    locked && showSignInChip && "opacity-55",
  );

  if (target.kind === "sheet") {
    return (
      <button type="button" onClick={onSheet} className={className}>
        {body}
      </button>
    );
  }

  return (
    <Link href={target.href} className={className}>
      {body}
    </Link>
  );
}

/** Default orders icon when no brand SVG exists yet. */
export const ProfileOrdersIcon: ProfileOptionIcon = {
  kind: "lucide",
  Icon: History,
};
