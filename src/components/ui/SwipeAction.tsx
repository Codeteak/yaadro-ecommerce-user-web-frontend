"use client";

import { Check, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";

const HANDLE = 48;
const COMPLETE_RATIO = 0.82;
const SUCCESS_HOLD_MS = 380;

type SwipeActionProps = {
  label?: string;
  disabled?: boolean;
  /** Return false to spring the handle back. */
  onComplete: () => void | boolean | Promise<void | boolean>;
};

export function SwipeAction({
  label = "Swipe to login",
  disabled = false,
  onComplete,
}: SwipeActionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const aliveRef = useRef(true);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    draggingRef.current = false;
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
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const finish = useCallback(() => {
    if (completed || disabled) return;
    setCompleted(true);
    setOffset(maxOffset);
    offsetRef.current = maxOffset;
    window.setTimeout(async () => {
      if (!aliveRef.current) return;
      const ok = await onCompleteRef.current();
      if (!aliveRef.current || ok !== false) return;
      reset();
    }, SUCCESS_HOLD_MS);
  }, [completed, disabled, maxOffset, reset]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (completed || disabled) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = event.clientX;
    startOffsetRef.current = offsetRef.current;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore if this pointer is already gone.
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current || completed || disabled) return;
    const next = Math.min(
      maxOffset,
      Math.max(0, startOffsetRef.current + event.clientX - startXRef.current),
    );
    offsetRef.current = next;
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (offsetRef.current >= maxOffset * COMPLETE_RATIO && maxOffset > 0) {
      finish();
      return;
    }
    offsetRef.current = 0;
    setOffset(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || completed) return;
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      finish();
    }
  };

  const progress = maxOffset > 0 ? offset / maxOffset : 0;
  const moving = offset > 0 && !completed;
  const fillWidth = completed ? "100%" : `${offset + HANDLE + 8}px`;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-14 w-full select-none overflow-hidden rounded-full bg-white shadow-[0_8px_24px_rgba(47,107,47,0.12)]",
        disabled && "opacity-45",
      )}
      role="group"
      aria-label={label}
    >
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-0 rounded-full"
        style={{
          width: completed || offset > 0 ? fillWidth : 0,
          background: completed
            ? "var(--leaf)"
            : "linear-gradient(90deg, var(--mint) 0%, var(--leaf-bright) 72%, var(--leaf) 100%)",
          transition: dragging ? "none" : "width 0.34s ease, background-color 0.34s ease",
        }}
        aria-hidden
      />

      <p
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-[15px] font-semibold tracking-wide"
        style={{
          color: completed ? "#fff" : "var(--leaf)",
          opacity: completed ? 1 : Math.max(0.28, 0.62 - progress * 0.4),
        }}
        aria-hidden
      >
        {label}
      </p>

      <div
        className="absolute top-1 left-1 z-10"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.34s ease",
        }}
      >
        <button
          type="button"
          className={cn(
            "flex size-12 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(47,107,47,0.22)] touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
            !dragging && !completed && offset === 0 && !disabled && "swipe-handle-hint",
          )}
          style={{
            background: completed
              ? "#fff"
              : moving
                ? "radial-gradient(circle at 35% 30%, var(--leaf-bright), var(--forest))"
                : "radial-gradient(circle at 35% 30%, var(--leaf-bright), var(--mint))",
            color: completed ? "var(--leaf)" : moving ? "#fff" : "var(--leaf)",
          }}
          aria-label={`${label}. Drag right or press Enter.`}
          disabled={disabled || completed}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {completed ? (
            <Check aria-hidden className="size-5" strokeWidth={2.75} />
          ) : (
            <ChevronRight aria-hidden className="size-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
