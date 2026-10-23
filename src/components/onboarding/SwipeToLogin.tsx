"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";

const HANDLE = 52;
const COMPLETE_RATIO = 0.78;
const COMPLETE_PULSE_MS = 420;

type SwipeToLoginProps = {
  href?: string;
  label?: string;
  /** When set, called instead of navigating — keeps the welcome hero mounted. */
  onComplete?: () => void;
};

export function SwipeToLogin({
  href = "/login",
  label = "Swipe to Login",
  onComplete,
}: SwipeToLoginProps) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);

  const reset = useCallback(() => {
    draggingRef.current = false;
    startXRef.current = 0;
    startOffsetRef.current = 0;
    offsetRef.current = 0;
    setOffset(0);
    setDragging(false);
    setCompleted(false);
  }, []);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setMaxOffset(Math.max(0, track.clientWidth - HANDLE - 8));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  const finish = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    setOffset(maxOffset);
    offsetRef.current = maxOffset;
    window.setTimeout(() => {
      if (onComplete) {
        onComplete();
        return;
      }
      router.push(href);
    }, COMPLETE_PULSE_MS);
  }, [completed, href, maxOffset, onComplete, router]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (completed) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = event.clientX;
    startOffsetRef.current = offsetRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current || completed) return;
    const delta = event.clientX - startXRef.current;
    const next = Math.min(maxOffset, Math.max(0, startOffsetRef.current + delta));
    offsetRef.current = next;
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (offsetRef.current >= maxOffset * COMPLETE_RATIO) {
      finish();
      return;
    }
    offsetRef.current = 0;
    setOffset(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      finish();
    }
  };

  const fillWidth = Math.max(HANDLE + 8, offset + HANDLE + 8);
  const showHint = !dragging && !completed && offset === 0;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-[56px] w-full select-none overflow-hidden rounded-full bg-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        completed && "swipe-track-pulse",
      )}
      role="group"
      aria-label={label}
    >
      {/* Solid brand fill grows with the handle (rail stays ink for contrast) */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-0 rounded-full bg-leaf"
        style={{
          width: fillWidth,
          transition: dragging ? "none" : "width 0.28s ease",
        }}
        aria-hidden
      />

      <p
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center pl-8 text-[15px] font-semibold tracking-wide text-white transition-opacity duration-200"
        style={{
          opacity: completed
            ? 0.35
            : Math.max(0.28, 1 - offset / (maxOffset || 1)),
        }}
        aria-hidden
      >
        {label}
      </p>

      <span
        className="pointer-events-none absolute top-1/2 right-4 z-[1] -translate-y-1/2 text-white/90"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h12M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div
        className="absolute top-1 left-1 z-10"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.28s ease",
        }}
      >
        <button
          type="button"
          className={cn(
            "flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-leaf shadow-[0_3px_12px_rgba(0,0,0,0.16)] touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-bright",
            showHint && "swipe-handle-hint",
          )}
          aria-label={`${label}. Drag right or press Enter to continue.`}
          disabled={completed}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <Image
            src="/onboarding/cart-icon.svg"
            alt=""
            width={22}
            height={22}
            className="pointer-events-none"
            unoptimized
          />
        </button>
      </div>
    </div>
  );
}
