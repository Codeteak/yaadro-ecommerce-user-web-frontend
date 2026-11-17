"use client";

import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSwipeToComplete } from "@/components/ui/useSwipeToComplete";

const HANDLE = 48;

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
  const {
    trackRef,
    offset,
    maxOffset,
    dragging,
    completed,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
  } = useSwipeToComplete({
    handle: HANDLE,
    completeRatio: 0.82,
    disabled,
    onComplete,
    holdMs: 380,
  });

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
