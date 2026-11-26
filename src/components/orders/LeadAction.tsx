"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function LeadAction({
  label,
  icon,
  filled,
  onClick,
  href,
  external,
}: {
  label: string;
  icon: ReactNode;
  filled?: boolean;
  onClick?: () => void;
  href?: string;
  /** Open `href` in a new tab (partner tracking URL). */
  external?: boolean;
}) {
  const className = cn(
    "inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-bold",
    filled
      ? "bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.28)]"
      : "bg-white text-black ring-[1.4px] ring-[#E6E6EA]",
  );
  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {icon}
        <span className="truncate">{label}</span>
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        <span className="truncate">{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(className, "cursor-pointer")}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
