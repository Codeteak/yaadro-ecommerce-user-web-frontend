import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FESTIVE_SECTION_BG } from "@/lib/festive-offers";

type FestiveHeroCardProps = {
  className?: string;
  /**
   * `section` — full home image card (art not cropped short).
   * `page` — tall PLP image card so the festive page keeps the same look.
   */
  variant?: "section" | "page";
  /** Admin home-section title (falls back to “Festive offers”). */
  title?: string;
  seeAllHref?: string;
  showSeeAll?: boolean;
  priority?: boolean;
  /** Product grid / extra content inside the image card. */
  children?: ReactNode;
};

/**
 * Full festive image card — BG art fills the rounded frame (object-center).
 * Headline uses the admin shelf title when provided.
 */
export function FestiveHeroCard({
  className,
  variant = "section",
  title,
  seeAllHref,
  showSeeAll = false,
  priority = false,
  children,
}: FestiveHeroCardProps) {
  const section = variant === "section";
  const heading = title?.trim() || "Festive offers";

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(80,50,20,0.22)] ring-1 ring-black/[0.08]",
        section
          ? "min-h-[34rem] sm:min-h-[36rem]"
          : "min-h-[22rem] sm:min-h-[24rem]",
        className,
      )}
    >
      <Image
        src={FESTIVE_SECTION_BG}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 512px) 100vw, 512px"
        className="object-cover object-center"
      />

      {/* Light wash — keep cream / gold art visible, don’t crop the story */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f5e6c8]/40 via-transparent to-black/50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/60 via-black/25 to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col justify-between gap-5 px-5",
          section ? "pt-9 pb-6 sm:pt-10 sm:pb-7" : "pt-8 pb-6 sm:pt-9 sm:pb-7",
        )}
      >
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-forest/85 uppercase drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
            Season&apos;s picks
          </p>
          <h2 className="mt-2 text-[1.7rem] leading-tight font-extrabold tracking-tight text-forest drop-shadow-[0_1px_0_rgba(255,255,255,0.55)] sm:text-[1.85rem]">
            {heading}
          </h2>
          <p className="mx-auto mt-2 max-w-[17rem] text-[13px] leading-5 font-medium text-forest/90 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
            {section
              ? "Treats and deals for the celebration."
              : "All festive picks from this shop."}
          </p>
          {showSeeAll && seeAllHref ? (
            <Link
              href={seeAllHref}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-track px-6 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              See all offers
            </Link>
          ) : null}
        </div>

        {children ? (
          <div className="min-h-0">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
