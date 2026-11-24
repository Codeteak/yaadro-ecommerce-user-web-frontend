"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProfileOptionTarget } from "@/lib/profile-options";

type ProfileOptionRowProps = {
  label: string;
  description: string;
  icon: LucideIcon;
  target: ProfileOptionTarget;
  onSheet?: () => void;
};

/**
 * One options-list row — link, login redirect, or sheet trigger.
 * Locked rows still navigate to login so guests can finish the action.
 */
export function ProfileOptionRow({
  label,
  description,
  icon: Icon,
  target,
  onSheet,
}: ProfileOptionRowProps) {
  const locked = target.kind === "login";
  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint">
        <Icon aria-hidden className="size-5 text-forest" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-black">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-muted">
          {locked ? "Sign in to use this" : description}
        </span>
      </span>
      {locked ? (
        <Lock aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={2.2} />
      ) : (
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      )}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 px-3.5 py-3.5 transition",
    "hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-leaf",
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
