'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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

/** Fallback when `sizes` is empty — always offer ×1 and ×2 of the catalog step. */
const DEFAULT_PACK_COUNTS = [1, 2];
const MAX_PACKS = 10;

/**
 * After ADD on a custom-weight product: pick pack count of the catalog step.
 * Shows ×1 and ×2 variants with a − / qty / + control. Cart stores kg (= step × packs).
 */
export default function CustomWeightChooser({
  open,
  onOpenChange,
  product,
  productName,
  sizes,
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

  const baseOptions = useMemo(() => {
    const fromSizes = Array.isArray(sizes)
      ? sizes.filter((s) => s && Number(s.packCount) > 0)
      : [];
    if (fromSizes.length > 0) return fromSizes;

    if (!(stepKg > 0)) return [];
    const listKg = getListPrice(product) || Number(product?.price) || 0;
    const payKg = getEffectivePrice(product) || listKg;
    return DEFAULT_PACK_COUNTS.map((packCount) => {
      const amountKg = packCountToKgQty(packCount, stepKg);
      const prices = weightStepLinePrices(product, {
        weightStep: true,
        weight: amountKg,
        unit: 'kg',
      });
      return {
        packCount,
        weight: amountKg,
        unit: 'kg',
        price: prices?.list ?? Math.round(listKg * amountKg * 100) / 100,
        payPrice: prices?.pay ?? Math.round(payKg * amountKg * 100) / 100,
        label:
          formatMassAmountLabel(amountKg, 'kg') ||
          formatWeightUnitLabel(amountKg, 'kg') ||
          '',
        weightStep: true,
      };
    });
  }, [sizes, stepKg, product]);

  const [packs, setPacks] = useState(1);

  useEffect(() => {
    if (!open) return;
    const first = Number(baseOptions[0]?.packCount);
    setPacks(Number.isFinite(first) && first > 0 ? first : 1);
  }, [open, product?.id, baseOptions]);

  const selectedSize = useMemo(() => {
    if (!(stepKg > 0)) return null;
    const amountKg = packCountToKgQty(packs, stepKg);
    const fromList = baseOptions.find(
      (s) =>
        Number(s.packCount) === packs &&
        Math.abs(Number(s.weight) - amountKg) < 1e-9
    );
    if (fromList) return fromList;
    const listKg = getListPrice(product) || Number(product?.price) || 0;
    const payKg = getEffectivePrice(product) || listKg;
    const prices = weightStepLinePrices(product, {
      weightStep: true,
      weight: amountKg,
      unit: 'kg',
    });
    return {
      packCount: packs,
      weight: amountKg,
      unit: 'kg',
      price: prices?.list ?? Math.round(listKg * amountKg * 100) / 100,
      payPrice: prices?.pay ?? Math.round(payKg * amountKg * 100) / 100,
      label:
        formatMassAmountLabel(amountKg, 'kg') ||
        formatWeightUnitLabel(amountKg, 'kg') ||
        '',
      weightStep: true,
    };
  }, [stepKg, packs, baseOptions, product]);

  const prices = selectedSize ? weightStepLinePrices(product, selectedSize) : null;
  const pay = prices?.pay ?? selectedSize?.payPrice ?? 0;
  const canDec = packs > 1 && !busy;
  const canInc = packs < MAX_PACKS && !busy;

  const handleAdd = (e) => {
    if (busy || !selectedSize) return;
    playAddTap(e.currentTarget);
    onSelect(selectedSize);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[81] mx-auto w-full max-w-[430px] rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden />
          <Dialog.Title className="text-[16px] font-bold leading-snug text-gray-900">
            Choose weight
          </Dialog.Title>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{productName}</p>

          <div className="mt-4 space-y-2" role="listbox" aria-label="Weight options">
            {baseOptions.map((opt) => {
              const pack = Number(opt.packCount) || 1;
              const optPrices = weightStepLinePrices(product, opt);
              const optPay = optPrices?.pay ?? opt.payPrice ?? 0;
              const selected = pack === packs;
              const title =
                pack <= 1
                  ? opt.label || stepLabel || 'Weight'
                  : `${stepLabel || opt.label} × ${pack}`;

              return (
                <button
                  key={`${pack}-${opt.weight}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={busy}
                  onClick={() => setPacks(pack)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] disabled:opacity-60 ${
                    selected
                      ? 'border-[#902bf5] bg-violet-50/80 ring-2 ring-[#902bf5]/30'
                      : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-gray-900">{title}</p>
                    <p className="mt-0.5 text-[12px] font-medium text-gray-500">
                      {pack <= 1 ? '1 pack' : `${pack} packs`}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-[15px] font-bold tabular-nums ${
                      selected ? 'text-[#902bf5]' : 'text-gray-900'
                    }`}
                  >
                    ₹{formatRupeeINR(optPay)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900">Quantity</p>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {packs <= 1
                  ? selectedSize?.label || stepLabel
                  : `${stepLabel} × ${packs}${
                      selectedSize?.label ? ` · ${selectedSize.label}` : ''
                    }`}
              </p>
            </div>
            <div
              className="flex h-11 shrink-0 items-center overflow-hidden rounded-full bg-white ring-2 ring-[#902bf5]"
              role="group"
              aria-label="Pack quantity"
            >
              <button
                type="button"
                disabled={!canDec}
                onClick={() => setPacks((p) => Math.max(1, p - 1))}
                className="inline-flex size-11 items-center justify-center text-[#902bf5] active:scale-95 disabled:opacity-40"
                aria-label="Decrease packs"
              >
                <span className="text-lg font-bold leading-none">−</span>
              </button>
              <span className="min-w-[2rem] text-center text-[15px] font-bold tabular-nums text-[#902bf5]">
                {packs}
              </span>
              <button
                type="button"
                disabled={!canInc}
                onClick={() => setPacks((p) => Math.min(MAX_PACKS, p + 1))}
                className="inline-flex size-11 items-center justify-center text-[#902bf5] active:scale-95 disabled:opacity-40"
                aria-label="Increase packs"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </button>
            </div>
          </div>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
