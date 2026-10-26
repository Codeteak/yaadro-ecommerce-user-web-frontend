"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CloseButton } from "@/components/navigation/CloseButton";

/**
 * Special-campaign pop-up flyer (Home only).
 *
 * Frequency-capped: at most once per day per campaign, remembered in
 * localStorage. Bump CAMPAIGN_ID when a new flyer campaign starts and
 * it can show again the same day. The creative is a placeholder build
 * (cart art + copy) until real flyer artwork is supplied — swap the
 * poster block for a flyer image when one exists.
 */
const CAMPAIGN_ID = "fresh-welcome-v1";
const STORAGE_KEY = `yaadro-flyer:${CAMPAIGN_ID}`;

export function OfferFlyer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer = 0;
    try {
      const today = new Date().toDateString();
      if (window.localStorage.getItem(STORAGE_KEY) === today) return;
      timer = window.setTimeout(() => {
        setVisible(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, today);
        } catch {
          // storage unavailable — flyer may reappear next visit
        }
      }, 700);
    } catch {
      // storage unavailable — don't show repeatedly in this session either
    }
    return () => window.clearTimeout(timer);
  }, []);

  // Scroll lock + Escape while the flyer is up.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Special offer"
    >
      <button
        type="button"
        aria-label="Close offer"
        onClick={() => setVisible(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-track/55 backdrop-blur-[2px]"
      />
      <div className="verified-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#3d8f3d] to-[#2f6b2f] shadow-[0_32px_64px_rgba(47,107,47,0.45)]">
        <div className="absolute top-3 right-3 z-10">
          <CloseButton onClick={() => setVisible(false)} />
        </div>

        <div className="flex flex-col items-center px-6 pt-8 pb-7 text-center">
          <div className="w-52">
            <Image
              src="/home/cart-hero-exact.png"
              alt="Grocery cart filled with fresh food and a Yaadro bag"
              width={1671}
              height={941}
              // Exact full frame, only scaled (same framing as the hero).
              style={{ width: "186%", marginLeft: "-47.7%" }}
              className="h-auto max-w-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.4)]"
            />
          </div>
          <h2 className="mt-4 text-2xl leading-tight font-extrabold text-white">
            Something fresh is coming
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Special offer flyers from your shop will appear here. For now,
            browse what&apos;s fresh today.
          </p>
          <Link
            href="/categories"
            onClick={() => setVisible(false)}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-bold text-forest transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Shop now
          </Link>
          <span className="mt-4 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold tracking-[0.16em] text-white/70 uppercase">
            Sample flyer
          </span>
        </div>
      </div>
    </div>
  );
}
