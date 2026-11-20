"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

type SwipeToCompleteOptions = {
  handle: number;
  completeRatio: number;
  disabled?: boolean;
  /** Called after the handle reaches the end. Return false to spring back. */
  onComplete: () => void | boolean | Promise<void | boolean>;
  holdMs?: number;
  resetOnPageShow?: boolean;
};

/**
 * Shared drag-to-complete track used by login and other swipe actions.
 */
export function useSwipeToComplete({
  handle,
  completeRatio,
  disabled = false,
  onComplete,
  holdMs = 380,
  resetOnPageShow = false,
}: SwipeToCompleteOptions) {
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

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
    setMaxOffset(Math.max(0, track.clientWidth - handle - 8));
  }, [handle]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!resetOnPageShow) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset, resetOnPageShow]);

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
    }, holdMs);
  }, [completed, disabled, holdMs, maxOffset, reset]);

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
    if (offsetRef.current >= maxOffset * completeRatio && maxOffset > 0) {
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

  return {
    trackRef,
    offset,
    maxOffset,
    dragging,
    completed,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
  };
}
