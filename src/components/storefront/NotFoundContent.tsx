"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";

export type NotFoundContentProps = {
  className?: string;
  /** Button label — defaults to Refresh (reloads the current URL). */
  refreshLabel?: string;
};

/**
 * Lost-explorer 404 empty state — used by `app/not-found.tsx`
 * and `/playground/not-found`.
 */
export function NotFoundContent({
  className,
  refreshLabel = "Refresh",
}: NotFoundContentProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center bg-paper px-5 py-16 text-center",
        className,
      )}
    >
      <Image
        src="/errors/404-explorer.png"
        alt=""
        width={1536}
        height={1024}
        className="h-auto w-full max-w-[22rem] rounded-2xl"
        priority
      />
      <p className="mt-6 text-[13px] font-bold tracking-[0.16em] text-leaf uppercase">
        Error 404
      </p>
      <h1 className="mt-2 text-[1.375rem] font-bold tracking-tight text-ink sm:text-[1.625rem]">
        Page not found
      </h1>
      <p className="mt-2 max-w-64 text-sm leading-6 text-muted">
        This trail doesn’t lead anywhere. Refresh or try a different link.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        className="mt-6 inline-flex h-12 cursor-pointer items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        {refreshLabel}
      </button>
    </main>
  );
}
