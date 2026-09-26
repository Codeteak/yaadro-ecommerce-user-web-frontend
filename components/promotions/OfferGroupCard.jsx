'use client';

import ProductImageWithFallback from '../ProductImageWithFallback';
import { getCartLinePreviewImageSrc } from '../../utils/productImages';
import { getCartLineVariantLabel } from '../../utils/productUtils';
import {
  getCartLinePaidQty,
  isBundleRewardCartLine,
} from '../../utils/cartPromotions';
import {
  cartQuantityStep,
  formatCartQtyControlLabel,
  formatSoldByWeightPurchaseLabel,
} from '../../utils/productSizeSelection';
import { lineListUnit, linePayTotal, lineUnitPrice } from '../../utils/offerDisplay';
import { toDisplayText } from '../../utils/productApi';

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

function FreeWithLabel() {
  return (
    <div
      className="flex items-center gap-2 py-1.5"
      role="separator"
      aria-label="Free with this item"
    >
      <span className="h-px min-w-[12px] flex-1 bg-violet-200/90" aria-hidden />
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700">
        Free with this item
      </span>
      <span className="h-px min-w-[12px] flex-1 bg-violet-200/90" aria-hidden />
    </div>
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
  const itemName = toDisplayText(item?.name) || 'Product';
  const brandLabel = toDisplayText(item?.brand);
  const paidQty = isFree ? Number(item.quantity) || 1 : getCartLinePaidQty(item);
  const unit = lineUnitPrice(item);
  const listUnit = lineListUnit(item);
  const linePay = isFree ? 0 : linePayTotal(item);
  const cartItemRef = item.cartItemKey ?? item.cartItemId ?? item.id;
  // Compare list vs payable (linePay / qty), not sticky selectedSize.price.
  const payableUnit =
    !isFree && paidQty > 0 ? linePay / paidQty : unit;
  const showStrike =
    !isFree && listUnit != null && listUnit > payableUnit + 0.004;
  const listLine = showStrike ? listUnit * paidQty : null;
  const saveLine =
    showStrike && listLine != null
      ? Math.round((listLine - linePay) * 100) / 100
      : null;

  const imgBox = isFree
    ? compact
      ? 'h-10 w-10'
      : 'h-11 w-11'
    : compact
      ? 'h-12 w-12'
      : 'h-14 w-14';

  return (
    <div className={`flex gap-3 ${compact ? 'py-1.5' : isFree ? 'py-1.5' : 'py-2'}`}>
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-xl bg-white ${imgBox} ${
          isFree ? 'ring-1 ring-emerald-100' : ''
        }`}
      >
        <ProductImageWithFallback
          src={imageSrc}
          alt={itemName}
          fill
          className="object-contain object-center"
          sizes={isFree ? '44px' : '56px'}
          placeholderName={itemName}
          placeholderCategory={
            toDisplayText(item.categoryName) ||
            toDisplayText(item.category?.name) ||
            toDisplayText(typeof item.category === 'string' ? item.category : '') ||
            ''
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={`truncate font-medium text-gray-900 ${
              isFree ? 'text-[12px]' : 'text-[13px]'
            }`}
          >
            {itemName}
          </p>
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
          {!isFree &&
            saveLine != null &&
            saveLine >= 0.005 &&
            !(badges || []).some((b) => String(b).startsWith('SAVE')) && (
              <OfferBadgePill tone="red">SAVE ₹{Math.round(saveLine)}</OfferBadgePill>
            )}
        </div>
        <p className="mt-0.5 text-[11px] text-gray-400">
          {[
            formatSoldByWeightPurchaseLabel(item, paidQty) ||
              getCartLineVariantLabel(item),
            brandLabel,
          ]
            .filter(Boolean)
            .join(' · ') || ' '}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {isFree ? (
              <span className="text-[14px] font-bold tabular-nums text-emerald-700">FREE</span>
            ) : (
              <span className="text-[15px] font-semibold tabular-nums text-gray-900">
                ₹{linePay.toLocaleString('en-IN')}
              </span>
            )}
            {showStrike && listLine != null && (
              <span className="text-[11px] text-gray-400 line-through tabular-nums">
                ₹{listLine.toLocaleString('en-IN')}
              </span>
            )}
            {saveLine != null && saveLine >= 0.005 ? (
              <span className="text-[11px] font-semibold tabular-nums text-violet-700">
                ₹{saveLine.toLocaleString('en-IN')} OFF
              </span>
            ) : null}
          </div>

          {isFree || !showStepper ? (
            <span className="text-[12px] font-medium text-gray-500">
              Qty: {formatCartQtyControlLabel(item, paidQty)}
            </span>
          ) : (
            <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => {
                  const step = cartQuantityStep(item);
                  const next =
                    paidQty <= step + 1e-9
                      ? 0
                      : Math.round((paidQty - step) * 10000) / 10000;
                  onQuantityChange?.(cartItemRef, next);
                }}
                className="flex h-7 w-8 items-center justify-center text-base text-gray-700 transition hover:bg-gray-50"
                aria-label={
                  paidQty <= cartQuantityStep(item) + 1e-9
                    ? 'Remove item'
                    : 'Decrease quantity'
                }
              >
                −
              </button>
              <span className="min-w-[20px] text-center text-[13px] font-medium text-gray-900">
                {formatCartQtyControlLabel(item, paidQty)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const step = cartQuantityStep(item);
                  onQuantityChange?.(
                    cartItemRef,
                    Math.round((paidQty + step) * 10000) / 10000
                  );
                }}
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
 * Off-white grouped promo card: parent paid line + free child with clear hierarchy.
 * Presentation only — parent/children come from buildCartOfferGroups.
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

      {hasChildren ? (
        <div className="mt-0.5" role="group" aria-label="Free items included with this purchase">
          {/* Stem under parent image column (w-14 / 56px → center ~28px) */}
          <div className="flex">
            <div className="flex w-14 flex-shrink-0 flex-col items-center" aria-hidden>
              <div className="h-2 w-px bg-violet-300" />
              <svg
                className="h-3.5 w-3.5 text-violet-500"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M8 2v9M4.5 8.5 8 12l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1 self-center">
              <FreeWithLabel />
            </div>
          </div>

          <ul className="m-0 list-none space-y-1 p-0">
            {group.children.map((child, index) => {
              const key = child.cartItemKey ?? child.cartItemId ?? child.id;
              const isLast = index === group.children.length - 1;
              return (
                <li key={key} className="flex animate-[fade-in_0.2s_ease-out]">
                  {/* Elbow connector aligned to parent image column */}
                  <div
                    className="relative flex w-14 flex-shrink-0 justify-center"
                    aria-hidden
                  >
                    <div
                      className={`absolute left-1/2 top-0 w-px -translate-x-1/2 bg-violet-300 ${
                        isLast ? 'h-5' : 'bottom-0'
                      }`}
                    />
                    <div className="absolute left-1/2 top-5 h-px w-[18px] bg-violet-300" />
                    <div className="absolute left-[calc(50%+16px)] top-5 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl bg-emerald-50/50 px-2 ring-1 ring-emerald-100/80">
                    <LineRow
                      item={child}
                      isFree
                      badges={['FREE']}
                      compact={compact}
                      showStepper={false}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export { OfferBadgePill, isBundleRewardCartLine };
