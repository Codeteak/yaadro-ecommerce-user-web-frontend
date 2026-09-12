'use client';

import ProductImageWithFallback from '../ProductImageWithFallback';
import { getCartLinePreviewImageSrc } from '../../utils/productImages';
import { getCartLineVariantLabel } from '../../utils/productUtils';
import {
  getCartLinePaidQty,
  isBundleRewardCartLine,
} from '../../utils/cartPromotions';
import { lineListUnit, linePayTotal, lineUnitPrice } from '../../utils/offerDisplay';

function OfferBadgePill({ children, tone = 'violet' }) {
  const tones = {
    violet: 'bg-violet-100 text-violet-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        tones[tone] || tones.violet
      }`}
    >
      {children}
    </span>
  );
}

function LineRow({
  item,
  isFree,
  badges,
  compact,
  onQuantityChange,
  onRemove,
  showStepper,
}) {
  const imageSrc = getCartLinePreviewImageSrc(item);
  const paidQty = isFree ? Number(item.quantity) || 1 : getCartLinePaidQty(item);
  const unit = lineUnitPrice(item);
  const listUnit = lineListUnit(item);
  const linePay = isFree ? 0 : linePayTotal(item);
  const cartItemRef = item.cartItemKey ?? item.cartItemId ?? item.id;
  const showStrike =
    !isFree && listUnit != null && listUnit > unit + 0.004;
  const listLine = showStrike ? listUnit * paidQty : null;

  return (
    <div className={`flex gap-3 ${compact ? 'py-1.5' : 'py-2'}`}>
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white">
        <ProductImageWithFallback
          src={imageSrc}
          alt={item.name || ''}
          fill
          className="object-contain object-center"
          sizes="56px"
          placeholderName={item.name || ''}
          placeholderCategory={
            item.categoryName ||
            item.category?.name ||
            (typeof item.category === 'string' ? item.category : '') ||
            ''
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-gray-900">{item.name}</p>
          {isFree ? <OfferBadgePill tone="green">FREE</OfferBadgePill> : null}
          {!isFree &&
            (badges || [])
              .filter((b) => b && b !== 'FREE')
              .slice(0, 2)
              .map((b) => (
                <OfferBadgePill key={b} tone={String(b).startsWith('SAVE') ? 'red' : 'violet'}>
                  {b}
                </OfferBadgePill>
              ))}
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {[getCartLineVariantLabel(item), item.brand].filter(Boolean).join(' · ') || ' '}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tabular-nums text-gray-900">
              {isFree ? '₹0' : `₹${linePay.toLocaleString('en-IN')}`}
            </span>
            {showStrike && listLine != null && (
              <span className="text-[11px] text-gray-400 line-through tabular-nums">
                ₹{listLine.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {isFree || !showStepper ? (
            <span className="text-[12px] font-medium text-gray-600">Qty: {paidQty}</span>
          ) : (
            <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => onQuantityChange?.(cartItemRef, paidQty - 1)}
                className="flex h-7 w-8 items-center justify-center text-base text-gray-700 transition hover:bg-gray-50"
                aria-label={paidQty <= 1 ? 'Remove item' : 'Decrease quantity'}
              >
                −
              </button>
              <span className="min-w-[20px] text-center text-[13px] font-medium text-gray-900">
                {paidQty}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange?.(cartItemRef, paidQty + 1)}
                disabled={paidQty >= 10}
                className="flex h-7 w-8 items-center justify-center text-base text-gray-700 transition hover:bg-gray-50 disabled:text-gray-300"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {!isFree && onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(cartItemRef)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center self-start rounded-lg bg-white/80 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="Remove item"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Off-white grouped promo card: parent paid line + free child with connector.
 */
export default function OfferGroupCard({
  group,
  onQuantityChange,
  onRemove,
  compact = false,
  showStepper = true,
}) {
  if (!group?.parent) return null;
  const hasChildren = Array.isArray(group.children) && group.children.length > 0;
  const isBogo = group.offerType === 'buy_x_get_y' || hasChildren;

  return (
    <div
      className={`rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      {isBogo && group.bundleLabel ? (
        <p className="mb-1.5 text-[11px] font-semibold text-violet-800">{group.bundleLabel}</p>
      ) : null}

      <LineRow
        item={group.parent}
        isFree={false}
        badges={group.badges}
        compact={compact}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
        showStepper={showStepper}
      />

      {hasChildren
        ? group.children.map((child) => {
            const key = child.cartItemKey ?? child.cartItemId ?? child.id;
            return (
              <div key={key} className="relative ml-2 border-l border-dashed border-gray-300 pl-3">
                <span
                  className="absolute -left-[1px] top-4 text-gray-400"
                  aria-hidden
                >
                  ⌞
                </span>
                <LineRow
                  item={child}
                  isFree
                  badges={['FREE']}
                  compact={compact}
                  showStepper={false}
                />
              </div>
            );
          })
        : null}
    </div>
  );
}

export { OfferBadgePill, isBundleRewardCartLine };
