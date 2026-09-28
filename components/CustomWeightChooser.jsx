'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatMassAmountLabel,
  formatRupeeINR,
  formatWeightUnitLabel,
  getEffectivePrice,
  getListPrice,
} from '../utils/productUtils';
import {
  packCountToKgQty,
  soldByWeightStepKg,
  weightStepLinePrices,
} from '../utils/productSizeSelection';
import { playAddTap } from '../utils/playAddTap';
import { lockAppScroll, unlockAppScroll } from '../lib/pwa/appShell';
import { createAppPortal } from '../lib/pwa/safePortal';

/** Chip choices: 1× or 2× the catalog step (e.g. 100 g or 200 g). */
const UNIT_MULTIPLIERS = [1, 2];
/** How many of the chosen unit the customer can add in one go. */
const MAX_QTY = 10;

/**
 * Custom-weight add sheet.
 *
 * TWO independent states (this was the bug — they used to share one `packs`):
 * - `unitMultiplier` (chips): purchase unit = catalog step × 1 or × 2
 * - `quantity` (stepper): how many of that unit
 *
 * Example: catalog step 100 g, chip ×2, qty 3 → 200 g × 3 = 600 g.
 * Increasing qty keeps the 200 g unit; it does NOT fall back to 100 g × N.
 */
export default function CustomWeightChooser({
  open,
  onOpenChange,
  product,
  productName,
  sizes,
  initialPackCount = null,
  busy = false,
  onSelect,
}) {
  const stepKg = soldByWeightStepKg(product) || Number(sizes?.[0]?.weight) || 0;
  const stepLabel =
    (stepKg > 0
      ? formatMassAmountLabel(stepKg, 'kg') || formatWeightUnitLabel(stepKg, 'kg')
      : '') ||
    sizes?.[0]?.label ||
    '';

  const [unitMultiplier, setUnitMultiplier] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    lockAppScroll();
    const onKey = e => {
      if (e.key === 'Escape') onOpenChange?.(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlockAppScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const preferred = Number(initialPackCount);
    if (Number.isFinite(preferred) && preferred > 0) {
      // Prefer ×2 unit when opening with an even pack count ≥ 2.
      if (preferred >= 2 && preferred % 2 === 0) {
        setUnitMultiplier(2);
        setQuantity(Math.min(MAX_QTY, Math.max(1, preferred / 2)));
      } else {
        setUnitMultiplier(1);
        setQuantity(Math.min(MAX_QTY, Math.max(1, Math.round(preferred))));
      }
      return;
    }
    setUnitMultiplier(1);
    setQuantity(1);
  }, [open, product?.id, initialPackCount]);

  const purchaseUnitKg = useMemo(() => {
    if (!(stepKg > 0)) return 0;
    return packCountToKgQty(unitMultiplier, stepKg);
  }, [stepKg, unitMultiplier]);

  const purchaseUnitLabel = useMemo(() => {
    if (!(purchaseUnitKg > 0)) return stepLabel || '';
    return (
      formatMassAmountLabel(purchaseUnitKg, 'kg') ||
      formatWeightUnitLabel(purchaseUnitKg, 'kg') ||
      stepLabel ||
      ''
    );
  }, [purchaseUnitKg, stepLabel]);

  const selectedSize = useMemo(() => {
    if (!(stepKg > 0) || !(purchaseUnitKg > 0)) return null;
    const amountKg = packCountToKgQty(quantity, purchaseUnitKg);
    const listKg = getListPrice(product) || Number(product?.price) || 0;
    const payKg = getEffectivePrice(product) || listKg;
    const prices = weightStepLinePrices(product, {
      weightStep: true,
      weight: amountKg,
      unit: 'kg',
    });
    return {
      // Total catalog-step packs (for legacy callers).
      packCount: unitMultiplier * quantity,
      // Customer quantity of the chosen unit.
      customerQty: quantity,
      unitMultiplier,
      // Cart +/- and labels use this unit (stays 200 g when ×2 was chosen).
      purchaseUnitKg,
      weight: amountKg,
      unit: 'kg',
      price: prices?.list ?? Math.round(listKg * amountKg * 100) / 100,
      payPrice: prices?.pay ?? Math.round(payKg * amountKg * 100) / 100,
      label: formatMassAmountLabel(amountKg, 'kg') || formatWeightUnitLabel(amountKg, 'kg') || '',
      weightStep: true,
    };
  }, [stepKg, purchaseUnitKg, quantity, unitMultiplier, product]);

  const prices = selectedSize ? weightStepLinePrices(product, selectedSize) : null;
  const pay = prices?.pay ?? selectedSize?.payPrice ?? 0;
  const canDec = quantity > 1 && !busy;
  const canInc = quantity < MAX_QTY && !busy;

  const unitPrice = useMemo(() => {
    if (!(purchaseUnitKg > 0)) return 0;
    const one = weightStepLinePrices(product, {
      weightStep: true,
      weight: purchaseUnitKg,
      unit: 'kg',
    });
    return one?.pay ?? 0;
  }, [product, purchaseUnitKg]);

  const close = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleAdd = e => {
    if (busy || !selectedSize) return;
    playAddTap(e.currentTarget);
    onSelect(selectedSize);
  };

  if (!mounted || !open || !product) return null;

  const totalLabel = selectedSize?.label || '';
  const qtyHint =
    quantity <= 1
      ? purchaseUnitLabel || totalLabel
      : `${purchaseUnitLabel} × ${quantity}${totalLabel ? ` · ${totalLabel}` : ''}`;

  return createAppPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose weight"
        className="absolute inset-x-0 bottom-0 z-[1] mx-auto w-full max-w-[430px] rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl outline-none"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:mx-0" aria-hidden />
            <h2 className="text-[16px] font-bold leading-snug text-gray-900">Choose weight</h2>
            <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{productName}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        {/* Purchase unit — independent of quantity. */}
        <p className="mt-4 text-[12px] font-medium text-gray-500">Pack size</p>
        <div className="mt-2 flex gap-2" role="listbox" aria-label="Pack size">
          {UNIT_MULTIPLIERS.map(n => {
            const unitKg = packCountToKgQty(n, stepKg);
            const label =
              formatMassAmountLabel(unitKg, 'kg') || (n <= 1 ? stepLabel : `${stepLabel} × ${n}`);
            const selected = unitMultiplier === n;
            const chipPrices = weightStepLinePrices(product, {
              weightStep: true,
              weight: unitKg,
              unit: 'kg',
            });
            const chipPay = chipPrices?.pay ?? 0;
            return (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={busy}
                onClick={() => setUnitMultiplier(n)}
                className={`flex-1 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] disabled:opacity-60 ${
                  selected
                    ? 'border-[#902bf5] bg-violet-50/80 ring-2 ring-[#902bf5]/30'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p
                  className={`text-[15px] font-bold ${
                    selected ? 'text-[#902bf5]' : 'text-gray-900'
                  }`}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-gray-500">
                  ₹{formatRupeeINR(chipPay)} / pack
                </p>
              </button>
            );
          })}
        </div>

        {/* Quantity of the chosen pack size — does not change the unit. */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">Quantity</p>
            <p className="mt-0.5 text-[12px] text-gray-500">{qtyHint}</p>
          </div>
          <div
            className="flex h-11 shrink-0 items-center overflow-hidden rounded-full bg-white ring-2 ring-[#902bf5]"
            role="group"
            aria-label="Pack quantity"
          >
            <button
              type="button"
              disabled={!canDec}
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="inline-flex size-11 items-center justify-center text-[#902bf5] active:scale-95 disabled:opacity-40"
              aria-label="Decrease packs"
            >
              <span className="text-lg font-bold leading-none">−</span>
            </button>
            <span className="min-w-[2rem] text-center text-[15px] font-bold tabular-nums text-[#902bf5]">
              {quantity}
            </span>
            <button
              type="button"
              disabled={!canInc}
              onClick={() => setQuantity(q => Math.min(MAX_QTY, q + 1))}
              className="inline-flex size-11 items-center justify-center text-[#902bf5] active:scale-95 disabled:opacity-40"
              aria-label="Increase packs"
            >
              <span className="text-lg font-bold leading-none">+</span>
            </button>
          </div>
        </div>

        {unitPrice > 0 && quantity > 1 ? (
          <p className="mt-2 text-center text-[12px] text-gray-500">
            ₹{formatRupeeINR(unitPrice)} × {quantity} packs
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || !selectedSize}
          onClick={handleAdd}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#902bf5] text-[15px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(144,43,245,0.35)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
          ) : (
            `Add · ₹${formatRupeeINR(pay)}`
          )}
        </button>
      </div>
    </div>
  );
}
