'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AXIS_LOCK_PX,
  DRAG_CLICK_PX,
  resolvePointerAxis,
  shouldMarkAsDrag,
  shouldSuppressClickAfterDrag,
} from '../../utils/pointerDragClick';
import { getAppScrollEl } from '../../lib/pwa/appShell';
import { resolveRailWheelIntent } from '../../utils/railWheelIntent';

/**
 * Horizontal product / category rail.
 *
 * Touch & trackpad: native `overflow-x` scrolling (instant + momentum).
 * Mouse: click-drag updates `scrollLeft` 1:1 so desktop still feels direct.
 * Taps under {@link DRAG_CLICK_PX} still hit ADD / links.
 *
 * CRITICAL: `overflow-x:auto` + `overflow-y:hidden` creates a scrollport that
 * traps vertical wheel/trackpad pans when the pointer is over product cards.
 * Vertical deltas are forwarded to the page scroll owner (#app-scroll or window).
 */
export default function SmoothDragRail({
  children,
  className = '',
  trackClassName = '',
  ariaLabel = 'Horizontal list',
}) {
  const viewportRef = useRef(null);
  const pointerRef = useRef({
    id: null,
    startX: 0,
    startY: 0,
    originScroll: 0,
    axis: null,
    captured: false,
    /** Only mouse uses custom drag; touch stays native. */
    isMouse: false,
  });
  const didDragRef = useRef(false);
  const lastDeltaXRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      setCanScroll(viewport.scrollWidth > viewport.clientWidth + 1);
    };

    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(viewport);
    const track = viewport.firstElementChild;
    if (track) {
      ro?.observe(track);
      const mo =
        typeof MutationObserver === 'undefined'
          ? null
          : new MutationObserver(measure);
      mo?.observe(track, { childList: true, subtree: true, attributes: true });

      const onLoad = () => measure();
      track.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', onLoad);
      });
      window.addEventListener('load', onLoad);

      return () => {
        ro?.disconnect();
        mo?.disconnect();
        track.querySelectorAll('img').forEach((img) => {
          img.removeEventListener('load', onLoad);
        });
        window.removeEventListener('load', onLoad);
      };
    }

    return () => {
      ro?.disconnect();
    };
  }, []);

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

    const scrollPageBy = (deltaY) => {
      const scroller = getAppScrollEl();
      if (scroller) {
        const oy = window.getComputedStyle(scroller).overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
          scroller.scrollTop += deltaY;
          return;
        }
      }
      window.scrollBy(0, deltaY);
    };

    const onWheel = (event) => {
      const canH = viewport.scrollWidth > viewport.clientWidth + 1;
      const intent = resolveRailWheelIntent({
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        shiftKey: event.shiftKey,
        canScrollHoriz: canH,
      });

      if (intent === 'page') {
        event.preventDefault();
        scrollPageBy(event.deltaY);
        return;
      }
      if (intent === 'rail-shift') {
        event.preventDefault();
        viewport.scrollLeft += event.deltaY;
      }
      // native-h / ignore → leave to browser overflow-x or no-op
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const preventNativeDrag = (event) => event.preventDefault();
    viewport.addEventListener('dragstart', preventNativeDrag);
    return () => viewport.removeEventListener('dragstart', preventNativeDrag);
  }, []);

  const onPointerDown = (event) => {
    // Touch / pen: native overflow scrolling — do not take over the gesture.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth + 1) return;

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originScroll: viewport.scrollLeft,
      axis: null,
      captured: false,
      isMouse: true,
    };
    didDragRef.current = false;
    lastDeltaXRef.current = 0;
  };

  const onPointerMove = (event) => {
    const pointer = pointerRef.current;
    if (!pointer.isMouse || pointer.id !== event.pointerId) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const totalDx = event.clientX - pointer.startX;
    lastDeltaXRef.current = totalDx;

    if (!pointer.axis) {
      const axis = resolvePointerAxis(
        Math.abs(totalDx),
        Math.abs(event.clientY - pointer.startY),
        AXIS_LOCK_PX
      );
      if (!axis) return;
      pointer.axis = axis;
      // Vertical mouse drag → release to page; do not capture.
      if (axis !== 'x') {
        pointer.id = null;
        pointer.isMouse = false;
        return;
      }
    }
    if (pointer.axis !== 'x') return;

    if (!pointer.captured) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointer.captured = true;
    }

    event.preventDefault();
    // Finger/mouse moves right → content should move right → scrollLeft decreases.
    viewport.scrollLeft = pointer.originScroll - totalDx;

    if (shouldMarkAsDrag(totalDx, DRAG_CLICK_PX)) {
      didDragRef.current = true;
      if (!dragging) setDragging(true);
    }
  };

  const endPointer = (event) => {
    const pointer = pointerRef.current;
    if (!pointer.isMouse || pointer.id !== event.pointerId) return;
    const totalDx = event.clientX - pointer.startX;
    lastDeltaXRef.current = totalDx;

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
    pointer.isMouse = false;
    setDragging(false);
  };

  return (
    <div
      ref={viewportRef}
      className={`smooth-drag-rail relative overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide ${className}`.trim()}
      aria-label={ariaLabel}
      role="region"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div
        className={`drag-rail-track flex w-max select-none ${canScroll ? 'cursor-grab' : ''} ${
          dragging ? 'cursor-grabbing' : ''
        } ${trackClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
