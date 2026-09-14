'use client';

import { getProductOfferDisplay } from '../../utils/offerDisplay';
import { hasActiveOffer } from '../../utils/productUtils';
import { OfferBadgePill } from './OfferGroupCard';

/**
 * Off-white offer block above PDP buy CTA.
 */
export default function PdpOfferPanel({ product }) {
  const display = getProductOfferDisplay(product);
  if (!(hasActiveOffer(product) || display.badges.length > 0)) return null;

  const detail = display.secondaryText || display.bundleLabel;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {display.badges.map((b) => (
          <OfferBadgePill
            key={b}
            tone={String(b).startsWith('SAVE') ? 'red' : 'violet'}
          >
            {b}
          </OfferBadgePill>
        ))}
      </div>
      {detail ? (
        <p className="mt-2 text-[13px] font-medium text-gray-900">{detail}</p>
      ) : null}
      {display.offerType === 'buy_x_get_y' ? (
        <p className="mt-1 text-[11px] text-gray-500">
          {display.dealMode === 'cross_sku'
            ? 'Add the buy item. Free item applies at checkout.'
            : 'Free units apply when you qualify.'}
        </p>
      ) : null}
    </div>
  );
}
