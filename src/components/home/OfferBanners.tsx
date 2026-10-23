"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Offer banner slideshow (UI-only placeholder creative — real shop
 * banners replace these when a banners source exists; the "Sample"
 * chip marks them as placeholders, not live offers).
 *
 * Transform-based slider for smoothness: the track glides with a
 * 700ms CSS transition (GPU-composited, no scroll/snap fighting).
 * A clone of the first slide sits at the end, so the loop wraps
 * forward seamlessly instead of rewinding. 4s per slide; pauses
 * while touched/hovered and when the tab is hidden; manual for
 * reduced-motion users. Swipe and dots work anytime.
 */
const BANNERS = [
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
] as const;

const COUNT = BANNERS.length;
const SLIDE_MS = 4000;
const TRANSITION = "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)";

export function OfferBanners() {
  /** Track position 0..COUNT, where COUNT is the cloned first slide. */
  const [position, setPosition] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const pausedRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const active = position % COUNT;

  const next = () => {
    setTransitionOn(true);
    setPosition((p) => Math.min(p + 1, COUNT));
  };

  const prev = () => {
    if (position === 0) {
      // Jump (invisibly) to the clone of the first slide, then glide back.
      setTransitionOn(false);
      setPosition(COUNT);
      window.setTimeout(() => {
        setTransitionOn(true);
        setPosition(COUNT - 1);
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
    if (position === COUNT) {
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      next();
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [position]);

  const handlePointerUp = (e: React.PointerEvent) => {
    pausedRef.current = false;
    const startX = dragStartXRef.current;
    dragStartXRef.current = null;
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 10) suppressClickRef.current = true;
    if (dx <= -40) next();
    else if (dx >= 40) prev();
  };

  return (
    <section aria-label="Shop offers" className="mx-auto w-full max-w-lg px-5 pt-4">
      <div
        className="overflow-hidden rounded-[1.5rem]"
        onPointerDown={(e) => {
          pausedRef.current = true;
          dragStartXRef.current = e.clientX;
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pausedRef.current = false;
          dragStartXRef.current = null;
        }}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        onClickCapture={(e) => {
          // A swipe that ends on the Shop now link shouldn't trigger it.
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
            transform: `translateX(-${position * 100}%)`,
            transition: transitionOn ? TRANSITION : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {[...BANNERS, BANNERS[0]].map((banner, index) => (
            <article
              key={`${banner.id}-${index}`}
              aria-hidden={index === COUNT || undefined}
              className={`relative aspect-[2.2/1] w-full shrink-0 overflow-hidden bg-gradient-to-r ${banner.gradient}`}
            >
              <Image
                src={banner.image}
                alt=""
                width={240}
                height={240}
                className="absolute top-1/2 right-4 h-[78%] w-auto -translate-y-1/2 rounded-full object-cover ring-4 ring-white/25"
              />
              <div className="relative flex h-full max-w-[62%] flex-col justify-center pr-2 pl-5">
                <h2 className="text-lg leading-snug font-extrabold text-white">
                  {banner.title}
                </h2>
                <p className="mt-1 text-xs leading-4 text-white/80">{banner.subtitle}</p>
                <Link
                  href="/categories"
                  tabIndex={index === COUNT ? -1 : undefined}
                  className="mt-3 inline-flex h-8 w-fit items-center rounded-full bg-white px-3.5 text-xs font-bold text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Shop now
                </Link>
              </div>
              <span className="absolute top-3 right-3 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-white/85 uppercase">
                Sample
              </span>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Banner navigation">
        {BANNERS.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-label={`Show banner ${index + 1}: ${banner.title}`}
            onClick={() => {
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
