'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { formatRupeeINR } from '../utils/productUtils';
import { weightStepLinePrices } from '../utils/productSizeSelection';
import { playAddTap } from '../utils/playAddTap';

/**
 * After ADD on a custom-weight product: pick one step or two steps.
 * Prices are the per-kg catalog rate × that weight.
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
  const stepLabel = sizes?.[0]?.label || '';

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
          <div className="mt-3 flex flex-col gap-2">
            {(sizes || []).map((size) => {
              const prices = weightStepLinePrices(product, size);
              const pay = prices?.pay ?? size.payPrice;
              const packs = Number(size.packCount) || 1;
              const title =
                packs <= 1 ? size.label : stepLabel ? `${stepLabel} × ${packs}` : size.label;
              const total =
                packs > 1 && size.label && size.label !== title ? size.label : '';
              return (
                <button
                  key={`${size.packCount}-${size.weight}`}
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    playAddTap(e.currentTarget);
                    onSelect(size);
                  }}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left touch-manipulation transition active:scale-[0.98] active:border-violet-400 active:bg-violet-50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-gray-900">{title}</span>
                    {total ? (
                      <span className="mt-0.5 block text-[12px] font-medium text-gray-500">
                        {total}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[16px] font-bold tabular-nums text-[#902bf5]">
                    ₹{formatRupeeINR(pay)}
                  </span>
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
