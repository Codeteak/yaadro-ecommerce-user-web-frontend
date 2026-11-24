"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/navigation/CloseButton";
import { cn } from "@/lib/cn";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const noopSubscribe = () => () => undefined;
const clientMountedSnapshot = () => true;
const serverMountedSnapshot = () => false;

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** `alertdialog` for confirms (e.g. Log out). */
  role?: "dialog" | "alertdialog";
  /** Block Escape / backdrop while a request is running. */
  dismissible?: boolean;
  className?: string;
};

/**
 * Accessible sheet: portal, Escape, focus trap + restore, body scroll lock.
 * Bottom sheet on phones, centered card from `sm`.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  role = "dialog",
  dismissible = true,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    clientMountedSnapshot,
    serverMountedSnapshot,
  );

  useBodyScrollLock(open);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useEffect(() => {
    if (!open) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "[data-autofocus]",
    ) ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (dismissibleRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreTo?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        tabIndex={-1}
        className="absolute inset-0 bg-track/45 backdrop-blur-[2px]"
        onClick={() => {
          if (dismissible) onClose();
        }}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-paper shadow-[0_24px_48px_rgba(47,107,47,0.28)] outline-none sm:mx-4 sm:mb-4 sm:rounded-[1.75rem]",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div className="min-w-0 pt-2">
            <h2 id={titleId} className="text-lg font-extrabold text-black">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-[13px] leading-5 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? <CloseButton onClick={onClose} /> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
