'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import {
  AXIS_LOCK_PX,
  DRAG_CLICK_PX,
  resolvePointerAxis,
  shouldMarkAsDrag,
  shouldSuppressClickAfterDrag,
} from '../../utils/pointerDragClick';

/**
 * Horizontal rail with mouse and touch drag.
 * Framer Motion renders the transform; GSAP coasts after release.
 *
 * Tap safety: only suppress the following click when the rail actually moved
 * past {@link DRAG_CLICK_PX} (finger wobble alone must not kill category chips).
 */
export default function SmoothDragRail({
  children,
  className = '',
  trackClassName = '',
  ariaLabel = 'Horizontal list',
}) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const tweenRef = useRef(null);
  const pointerRef = useRef({
    id: null,
    startX: 0,
    startY: 0,
    origin: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    axis: null,
    captured: false,
  });
  const didDragRef = useRef(false);
  const lastDeltaXRef = useRef(0);
  const minXRef = useRef(0);
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const [minX, setMinX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const killTween = () => {
    tweenRef.current?.kill();
    tweenRef.current = null;
  };

  const clampX = useCallback((value) => {
    const min = minXRef.current;
    return Math.max(min, Math.min(0, value));
  }, []);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const styles = window.getComputedStyle(viewport);
    const padX =
      (Number.parseFloat(styles.paddingLeft) || 0) +
      (Number.parseFloat(styles.paddingRight) || 0);
    const visible = Math.max(0, viewport.clientWidth - padX);
    const nextMin = Math.min(0, visible - track.scrollWidth);
    minXRef.current = nextMin;
    setMinX(nextMin);
    const clamped = Math.max(nextMin, Math.min(0, x.get()));
    if (clamped !== x.get()) x.set(clamped);
  }, [x]);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return undefined;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(viewport);
    ro?.observe(track);
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(measure);
    mo?.observe(track, { childList: true, subtree: true, attributes: true });
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const onClickCapture = (event) => {
      const suppress = shouldSuppressClickAfterDrag({
        didDrag: didDragRef.current,
        totalDeltaX: lastDeltaXRef.current,
      });
      didDragRef.current = false;
      lastDeltaXRef.current = 0;
      if (!suppress) return;
      event.preventDefault();
      event.stopPropagation();
    };
    viewport.addEventListener('click', onClickCapture, true);
    return () => viewport.removeEventListener('click', onClickCapture, true);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const onWheel = (event) => {
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      const delta = absX > absY ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (!delta || minXRef.current === 0) return;
      event.preventDefault();
      killTween();
      x.set(clampX(x.get() - delta));
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [clampX, x]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const preventNativeDrag = (event) => event.preventDefault();
    track.addEventListener('dragstart', preventNativeDrag);
    return () => track.removeEventListener('dragstart', preventNativeDrag);
  }, []);

  useEffect(() => () => killTween(), []);

  const coastTo = useCallback(
    (velocityX) => {
      const current = x.get();
      if (minXRef.current === 0) {
        x.set(0);
        return;
      }
      if (reduceMotion) {
        x.set(clampX(current));
        return;
      }
      const target = clampX(current + velocityX * 0.18);
      const distance = Math.abs(target - current);
      if (distance < 0.5) {
        x.set(target);
        return;
      }
      const duration = Math.min(
        1.05,
        Math.max(0.38, distance / 860 + Math.abs(velocityX) / 3800)
      );
      killTween();
      const proxy = { val: current };
      tweenRef.current = gsap.to(proxy, {
        val: target,
        duration,
        ease: 'power3.out',
        onUpdate: () => x.set(proxy.val),
        onComplete: () => {
          tweenRef.current = null;
          x.set(target);
        },
      });
    },
    [clampX, reduceMotion, x]
  );

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (minXRef.current === 0) return;
    killTween();
    const now = performance.now();
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: x.get(),
      lastX: event.clientX,
      lastT: now,
      velocity: 0,
      axis: null,
      captured: false,
    };
    didDragRef.current = false;
    lastDeltaXRef.current = 0;
    // Do not capture yet — early capture steals the click from child buttons.
  };

  const onPointerMove = (event) => {
    const pointer = pointerRef.current;
    if (pointer.id !== event.pointerId) return;

    const totalDx = event.clientX - pointer.startX;
    lastDeltaXRef.current = totalDx;

    if (!pointer.axis) {
      const adx = Math.abs(totalDx);
      const ady = Math.abs(event.clientY - pointer.startY);
      const axis = resolvePointerAxis(adx, ady, AXIS_LOCK_PX);
      if (!axis) return;
      pointer.axis = axis;
      if (axis !== 'x') return;
    }
    if (pointer.axis !== 'x') return;

    if (!pointer.captured) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointer.captured = true;
    }

    event.preventDefault();
    const now = performance.now();
    const dx = event.clientX - pointer.lastX;
    const dt = Math.max(now - pointer.lastT, 1);
    pointer.velocity = dx / dt;
    pointer.lastX = event.clientX;
    pointer.lastT = now;
    const next = pointer.origin + totalDx;
    const min = minXRef.current;
    const overshoot = next > 0 ? next * 0.18 : next < min ? min + (next - min) * 0.18 : next;
    x.set(overshoot);
    if (shouldMarkAsDrag(totalDx, DRAG_CLICK_PX)) {
      didDragRef.current = true;
      setDragging(true);
    }
  };

  const endPointer = (event) => {
    const pointer = pointerRef.current;
    if (pointer.id !== event.pointerId) return;
    const wasHorizontal = pointer.axis === 'x';
    const totalDx = event.clientX - pointer.startX;
    lastDeltaXRef.current = totalDx;

    // Finger wobble mid-gesture then release near start → keep the click.
    if (
      !shouldSuppressClickAfterDrag({
        didDrag: didDragRef.current,
        totalDeltaX: totalDx,
      })
    ) {
      didDragRef.current = false;
    }

    if (pointer.captured) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    pointer.id = null;
    pointer.axis = null;
    pointer.captured = false;
    setDragging(false);
    if (!wasHorizontal) return;
    if (!shouldMarkAsDrag(totalDx, DRAG_CLICK_PX)) return;
    const velocityPxPerSec = pointer.velocity * 1000;
    x.set(clampX(x.get()));
    coastTo(velocityPxPerSec);
  };

  const canDrag = minX < 0;

  return (
    <div
      ref={viewportRef}
      className={`relative overflow-hidden touch-pan-y ${className}`.trim()}
      aria-label={ariaLabel}
      role="region"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <motion.div
        ref={trackRef}
        className={`drag-rail-track flex w-max select-none ${canDrag ? 'cursor-grab' : ''} ${
          dragging ? 'cursor-grabbing' : ''
        } ${trackClassName}`.trim()}
        style={{ x }}
      >
        {children}
      </motion.div>
    </div>
  );
}
