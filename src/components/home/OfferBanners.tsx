"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";

/**
 * Offer banner slideshow.
 * Live shop creatives: full-bleed image only (copy is in the art).
 * Playground samples: gradient + title / subtitle / Shop now + Sample chip.
 *
 * Transform-based slider: autoplay every 4s, dots anytime, and
 * finger-follow drag both ways (pointer capture + axis lock so page
 * scroll still works). A clone of the first slide sits at the end
 * for a seamless forward loop. Pauses while dragging/hovered and
 * when the tab is hidden; no autoplay for reduced-motion users.
 */
export type OfferBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href?: string;
  gradient?: string;
};

const SAMPLE_BANNERS: OfferBanner[] = [
  {
    id: "fresh-picks",
    title: "Fresh picks of the day",
    subtitle: "Fruits & vegetables, picked this morning",
    image: "/categories/fruits.jpg",
    gradient: "from-[#2f6b2f] via-[#3d8f3d] to-[#5cb85c]",
  },
  {
    id: "bakery-mornings",
    title: "Bakery mornings",
    subtitle: "Warm breads and bakes to start your day",
    image: "/categories/bakery.jpg",
    gradient: "from-[#3b1d02] via-[#7c4a03] to-[#d97706]",
  },
  {
    id: "snack-time",
    title: "Snack-time favourites",
    subtitle: "Chips, sips and bites for the evening",
    image: "/categories/snacks.jpg",
    gradient: "from-[#1e1b4b] via-[#4338ca] to-[#7c3aed]",
  },
];

const SLIDE_MS = 4000;
const TRANSITION = "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)";
const SWIPE_PX = 40;

export function OfferBanners({
  banners,
  /** Playground only — show sample creatives when no banners. */
  allowSample = false,
}: {
  banners?: OfferBanner[];
  allowSample?: boolean;
}) {
  const slides =
    banners && banners.length > 0
      ? banners
      : allowSample
        ? SAMPLE_BANNERS
        : [];
  const live = banners != null && banners.length > 0;
  const count = slides.length;
  /** Track position 0..count, where count is the cloned first slide. */
  const [position, setPosition] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const [dragPx, setDragPx] = useState(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisLockRef = useRef<"x" | "y" | null>(null);
  const suppressClickRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const active = count > 0 ? position % count : 0;

  const next = () => {
    if (count === 0) return;
    setTransitionOn(true);
    setPosition((p) => Math.min(p + 1, count));
  };

  const prev = () => {
    if (count === 0) return;
    if (position === 0) {
      // Jump (invisibly) to the clone of the first slide, then glide back.
      setTransitionOn(false);
      setPosition(count);
      window.setTimeout(() => {
        setTransitionOn(true);
        setPosition(count - 1);
      }, 60);
      return;
    }
    setTransitionOn(true);
    setPosition((p) => p - 1);
  };

  // When the glide onto the clone finishes, snap back to the real
  // first slide with the transition off — identical pixels, invisible.
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform") return;
    if (position === count) {
      setTransitionOn(false);
      setPosition(0);
    }
  };

  // Re-enable the transition a frame after any invisible jump.
  useEffect(() => {
    if (transitionOn) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setTransitionOn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [transitionOn]);

  // Slideshow timer — resets on every position change so a manual
  // swipe or dot tap always gets a full 4s before the next advance.
  useEffect(() => {
    if (count === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current || document.hidden || draggingRef.current) return;
      setTransitionOn(true);
      setPosition((p) => Math.min(p + 1, count));
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [count, position]);

  const endDrag = (clientX: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    axisLockRef.current = null;
    pausedRef.current = false;

    const dx = clientX - startXRef.current;
    const width = viewportRef.current?.offsetWidth ?? 300;
    const threshold = Math.max(SWIPE_PX, width * 0.18);

    setDragPx(0);
    setTransitionOn(true);

    if (Math.abs(dx) > 10) suppressClickRef.current = true;
    if (dx <= -threshold) next();
    else if (dx >= threshold) prev();
  };

  if (count === 0) return null;

  return (
    <section aria-label="Shop offers" className="mx-auto w-full max-w-lg px-5 pt-4">
      <div
        ref={viewportRef}
        className="touch-pan-y overflow-hidden rounded-[1.5rem]"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pausedRef.current = true;
          draggingRef.current = true;
          startXRef.current = e.clientX;
          startYRef.current = e.clientY;
          axisLockRef.current = null;
          setTransitionOn(false);
          setDragPx(0);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          const dx = e.clientX - startXRef.current;
          const dy = e.clientY - startYRef.current;

          if (!axisLockRef.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            axisLockRef.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
            if (axisLockRef.current === "y") {
              // Vertical intent — release so the page can scroll.
              draggingRef.current = false;
              setDragPx(0);
              setTransitionOn(true);
              pausedRef.current = false;
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              return;
            }
          }

          if (axisLockRef.current !== "x") return;
          setDragPx(dx);
        }}
        onPointerUp={(e) => {
          if (axisLockRef.current === "x" || draggingRef.current) {
            endDrag(e.clientX);
          } else {
            draggingRef.current = false;
            pausedRef.current = false;
            setDragPx(0);
            setTransitionOn(true);
          }
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          axisLockRef.current = null;
          pausedRef.current = false;
          setDragPx(0);
          setTransitionOn(true);
        }}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          if (!draggingRef.current) pausedRef.current = false;
        }}
        onClickCapture={(e) => {
          // A swipe that ends on a slide link shouldn't navigate.
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(-${position * 100}% + ${dragPx}px))`,
            transition: transitionOn && dragPx === 0 ? TRANSITION : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {[...slides, slides[0]].map((banner, index) => {
            const slideClass = `relative aspect-[2.2/1] w-full shrink-0 overflow-hidden bg-gradient-to-r select-none ${banner.gradient ?? "from-[#2f6b2f] via-[#3d8f3d] to-[#5cb85c]"}`;
            const media = live ? (
              <CatalogImage
                src={banner.image}
                alt=""
                fill
                sizes="(max-width: 512px) 100vw, 512px"
                priority={index === 0}
                className="pointer-events-none object-cover"
                draggable={false}
              />
            ) : (
              <CatalogImage
                src={banner.image}
                alt=""
                width={240}
                height={240}
                priority={index === 0}
                className="pointer-events-none absolute top-1/2 right-4 h-[78%] w-auto -translate-y-1/2 rounded-full object-cover ring-4 ring-white/25"
                draggable={false}
              />
            );

            // Live: creative is the banner — no title / Shop now overlay.
            if (live) {
              const href = banner.href?.trim();
              if (href) {
                return (
                  <Link
                    key={`${banner.id}-${index}`}
                    href={href}
                    aria-hidden={index === count || undefined}
                    tabIndex={index === count ? -1 : undefined}
                    aria-label={banner.title || "Shop offer"}
                    className={slideClass}
                  >
                    {media}
                  </Link>
                );
              }
              return (
                <article
                  key={`${banner.id}-${index}`}
                  aria-hidden={index === count || undefined}
                  aria-label={banner.title || "Shop offer"}
                  className={slideClass}
                >
                  {media}
                </article>
              );
            }

            return (
              <article
                key={`${banner.id}-${index}`}
                aria-hidden={index === count || undefined}
                className={slideClass}
              >
                {media}
                <div className="relative flex h-full max-w-[62%] flex-col justify-center pr-2 pl-5">
                  <h2 className="text-lg leading-snug font-extrabold text-white">
                    {banner.title}
                  </h2>
                  <p className="mt-1 text-xs leading-4 text-white/80">
                    {banner.subtitle}
                  </p>
                  <Link
                    href={banner.href ?? "/categories"}
                    tabIndex={index === count ? -1 : undefined}
                    className="mt-3 inline-flex h-8 w-fit items-center rounded-full bg-white px-3.5 text-xs font-bold text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Shop now
                  </Link>
                </div>
                <span className="absolute top-3 right-3 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-white/85 uppercase">
                  Sample
                </span>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Banner navigation">
        {slides.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-label={`Show banner ${index + 1}: ${banner.title}`}
            onClick={() => {
              setDragPx(0);
              setTransitionOn(true);
              setPosition(index);
            }}
            className={`h-2 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
              active === index ? "w-6 bg-leaf" : "w-2 bg-forest/20 hover:bg-forest/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
