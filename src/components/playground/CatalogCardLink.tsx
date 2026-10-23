"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { setCatalogScrollY } from "@/lib/playground/session";

/** Catalog card link that remembers scroll before opening a demo. */
export function CatalogCardLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/playground/${slug}`}
      data-playground-slug={slug}
      className={className}
      onClick={() => setCatalogScrollY(window.scrollY)}
    >
      {children}
    </Link>
  );
}
