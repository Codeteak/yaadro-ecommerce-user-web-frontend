"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

/**
 * Product-image carousel. One shot: centered card. Multiple: peeking
 * neighbors (~88% width) with dark-green pill dots.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const peek = count > 1;

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || count <= 1) return;
    const slide = el.clientWidth * 0.88;
    const next = Math.round(el.scrollLeft / Math.max(slide, 1));
    setIndex(Math.max(0, Math.min(count - 1, next)));
  }, [count]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !peek) return;
    el.addEventListener("scroll", syncIndex, { passive: true });
    return () => el.removeEventListener("scroll", syncIndex);
  }, [syncIndex, peek]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.clientWidth * 0.88;
    el.scrollTo({ left: slide * i, behavior: "smooth" });
    setIndex(i);
  };

  if (count === 0) return null;

  return (
    <div className="w-full">
      <div
        ref={scrollerRef}
        className={
          peek
            ? "flex snap-x snap-mandatory gap-3 overflow-x-auto px-[6%] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex justify-center px-5 pb-1"
        }
        aria-roledescription={peek ? "carousel" : undefined}
        aria-label={`${alt} photos`}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={
              peek
                ? "w-[88%] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-mint/40 to-white ring-1 ring-forest/8"
                : "w-full max-w-md overflow-hidden rounded-[2rem] bg-gradient-to-b from-mint/40 to-white ring-1 ring-forest/8"
            }
            aria-hidden={peek ? i !== index : undefined}
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={src}
                alt={i === 0 ? alt : `${alt} photo ${i + 1}`}
                fill
                sizes="(max-width: 512px) 88vw, 420px"
                className="object-cover"
                priority={i === 0}
              />
            </div>
          </div>
        ))}
      </div>

      {peek ? (
        <div
          className="mt-3 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Photo position"
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1} of ${count}`}
              onClick={() => goTo(i)}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                i === index
                  ? "w-5 bg-track"
                  : "w-1.5 bg-forest/20 hover:bg-forest/35"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
