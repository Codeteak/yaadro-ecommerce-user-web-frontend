'use client';

import { getProductOfferList } from '../../utils/offerDisplay';
import { OfferBadgePill } from './OfferGroupCard';

/**
 * Lists every product-related offer on PDP (BXGY rules + sale savings).
 */
export default function PdpOfferPanel({ product }) {
  const offers = getProductOfferList(product);
  if (!offers.length) return null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Offers on this product
      </p>
      <ul className="space-y-2.5">
        {offers.map((offer) => (
          <li key={offer.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {offer.badges.map((b) => (
                <OfferBadgePill
                  key={`${offer.id}-${b}`}
                  tone={String(b).startsWith('SAVE') ? 'red' : 'violet'}
                >
                  {b}
                </OfferBadgePill>
              ))}
            </div>
            {offer.title ? (
              <p className="text-[13px] font-medium text-gray-900">{offer.title}</p>
            ) : null}
            {offer.hint ? (
              <p className="text-[11px] text-gray-500">{offer.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
