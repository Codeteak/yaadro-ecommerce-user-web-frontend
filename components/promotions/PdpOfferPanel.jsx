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
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Offers on this product
      </p>
      <ul className="space-y-2">
        {offers.map((offer) => (
          <li key={offer.id} className="space-y-0.5">
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
              <p className="text-[12px] font-medium text-gray-900">{offer.title}</p>
            ) : null}
            {offer.hint ? (
              <p className="text-[11px] text-gray-500 leading-snug">{offer.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
