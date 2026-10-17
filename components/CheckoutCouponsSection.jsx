'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loading2Regular as Loader2, TagRegular as Tag } from './icons';
import { useStorefrontCoupons } from '../hooks/useCoupons';
import {
  formatCouponBenefitLabel,
  formatCouponRuleLines,
} from '../utils/storefrontCouponsApi';
import {
  BXGY_COUPON_BLOCKED_MESSAGE,
  formatCartCouponPreviewMessage,
  formatCouponIneligibilityHint,
  isCartCouponPreviewApplied,
} from '../utils/cartPromotions';
import {
  categoryProductsHref,
  formatAutoCartOfferPercent,
  getAppliedAutoCartOffers,
  getSuggestedAutoCartOffers,
} from '../utils/autoCartOffers';
import { formatInrFromMinor } from '../utils/currencyMinor';

function CouponRow({
  coupon,
  cartSubtotalMinor,
  selected,
  applied,
  applying,
  onSelect,
  onClear,
  eligibilityDays,
  applyFailure,
}) {
  const applicable = coupon.eligibility?.applicable !== false;
  const benefit =
    coupon.benefits?.length > 0 ? formatCouponBenefitLabel(coupon.benefits[0]) : 'Special offer';
  const rules = formatCouponRuleLines(coupon, { firstCouponEligibilityDays: eligibilityDays });
  const ineligibleHint = !applicable
    ? formatCouponIneligibilityHint(
        coupon.eligibility?.ineligibilityCodes,
        { ...coupon, eligibilityDays },
        cartSubtotalMinor
      )
    : null;
  const title = coupon.promotionName || benefit;

  return (
    <button
      type="button"
      disabled={!applicable || applying}
      onClick={() => (selected ? onClear(coupon.code) : onSelect(coupon.code))}
      className={`w-full rounded-2xl border p-3.5 text-left transition ${
        selected
          ? 'border-violet-500 bg-violet-50/80 ring-1 ring-violet-500/30'
          : applicable
            ? 'border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/40'
            : 'border-gray-100 bg-gray-50/80 opacity-75 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
            selected ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'
          }`}
        >
          <Tag size={16} className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white">
              {coupon.code}
            </span>
            {selected && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                {applied ? 'Applied' : applying ? 'Applying…' : 'Selected'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] font-medium text-gray-900 line-clamp-1">{title}</p>
          <p className="text-[12px] text-gray-500">{benefit}</p>
          <ul className="mt-1.5 space-y-0.5">
            {rules.map((line) => (
              <li key={line} className="text-[11px] leading-snug text-gray-600">
                {line}
              </li>
            ))}
          </ul>
          {ineligibleHint && (
            <p className="mt-1 text-[11px] font-medium text-amber-800">{ineligibleHint}</p>
          )}
          {selected && applyFailure && (
            <p className="mt-1 text-[11px] font-medium text-red-700">{applyFailure}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function SuggestedCouponChip({ code, applicable, applying, onSelect }) {
  return (
    <button
      type="button"
      disabled={!applicable || applying}
      onClick={() => onSelect(code)}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] font-semibold tracking-wide transition ${
        applicable
          ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400'
          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
      }`}
    >
      {code}
    </button>
  );
}

export default function CheckoutCouponsSection({
  cartSubtotalMinor,
  selectedCouponCode,
  selectedCouponCodes,
  onSelectCouponCode,
  onSelectCouponCodes,
  couponPreview,
  suggestedCoupons = [],
  isPreviewLoading = false,
  promotionsPaused: promotionsPausedFromCart = false,
  couponsBlocked = false,
  couponsBlockedMessage = '',
  /** Paise amount of automatic cart discount already applied (no code). */
  autoCartDiscountMinor = 0,
  /** Normalized promotions.auto from cart preview (applied/suggested offers). */
  autoCartPromotions = null,
  enabled = true,
  onApplyingChange,
}) {
  const autoCartApplied =
    Number.isFinite(Number(autoCartDiscountMinor)) && Number(autoCartDiscountMinor) > 0;
  const appliedAutoOffers = getAppliedAutoCartOffers(
    autoCartPromotions ? { auto: autoCartPromotions } : null
  );
  const suggestedAutoOffers = getSuggestedAutoCartOffers(
    autoCartPromotions ? { auto: autoCartPromotions } : null
  );
  const primaryApplied =
    appliedAutoOffers.find((o) => o.kind === 'category_percent_off') || appliedAutoOffers[0] || null;
  const codesFromProps = useMemo(() => {
    if (Array.isArray(selectedCouponCodes) && selectedCouponCodes.length) {
      return [
        ...new Set(
          selectedCouponCodes.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean)
        ),
      ];
    }
    const single = String(selectedCouponCode || '')
      .trim()
      .toUpperCase();
    return single ? [single] : [];
  }, [selectedCouponCode, selectedCouponCodes]);

  const [codeInput, setCodeInput] = useState(codesFromProps[0] || '');
  const [lookupCode, setLookupCode] = useState(null);
  const [codeLookupError, setCodeLookupError] = useState('');

  const { data, isLoading, isFetching, error } = useStorefrontCoupons(cartSubtotalMinor, {
    enabled: enabled && !couponsBlocked && cartSubtotalMinor != null,
    code: lookupCode || undefined,
  });

  const coupons = data?.coupons ?? [];
  const promotionsPaused = data?.promotionsPaused || promotionsPausedFromCart;
  const maxCouponsPerOrder = Math.max(
    1,
    Number(data?.settings?.maxCouponsPerOrder ?? 1) || 1
  );
  const multi = maxCouponsPerOrder > 1;

  const sortedCoupons = useMemo(() => {
    return [...coupons].sort((a, b) => {
      const aOk = a.eligibility?.applicable !== false ? 1 : 0;
      const bOk = b.eligibility?.applicable !== false ? 1 : 0;
      return bOk - aOk;
    });
  }, [coupons]);

  const primaryCode = codesFromProps[0] || '';
  const previewApplied = isCartCouponPreviewApplied(couponPreview, primaryCode);

  const previewNotApplicable =
    !!primaryCode &&
    couponPreview?.status === 'not_applicable' &&
    String(couponPreview.code || '').toUpperCase() === String(primaryCode).toUpperCase();

  const previewFailureMessage = previewNotApplicable
    ? formatCartCouponPreviewMessage(couponPreview)
    : null;

  const previewDiscountLabel =
    previewApplied && couponPreview.discountMinor > 0
      ? formatInrFromMinor(couponPreview.discountMinor)
      : null;

  const normalizedInput = String(codeInput || '').trim().toUpperCase();
  const applying =
    Boolean(lookupCode) ||
    (Boolean(primaryCode) &&
      isPreviewLoading &&
      !previewApplied &&
      !previewNotApplicable &&
      normalizedInput === primaryCode);
  const codeIsApplied = previewApplied && normalizedInput === primaryCode;

  useEffect(() => {
    if (typeof onApplyingChange === 'function') onApplyingChange(applying);
  }, [applying, onApplyingChange]);

  useEffect(() => {
    if (codesFromProps[0]) {
      setCodeInput(String(codesFromProps[0]).toUpperCase());
    }
  }, [codesFromProps]);

  const commitCodes = (nextCodes) => {
    const normalized = [
      ...new Set(nextCodes.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean)),
    ].slice(0, maxCouponsPerOrder);
    if (typeof onSelectCouponCodes === 'function') {
      onSelectCouponCodes(normalized);
    } else if (typeof onSelectCouponCode === 'function') {
      onSelectCouponCode(normalized[0] || '');
    }
  };

  useEffect(() => {
    if (!couponsBlocked) return;
    setLookupCode(null);
    setCodeLookupError('');
    setCodeInput('');
    if (selectedCouponCode) onSelectCouponCode('');
  }, [couponsBlocked, selectedCouponCode, onSelectCouponCode]);

  useEffect(() => {
    if (!lookupCode || isLoading || isFetching) return;
    const match = coupons.find(
      (c) => String(c.code).toUpperCase() === String(lookupCode).toUpperCase()
    );
    if (!match) {
      setCodeLookupError('This coupon code is not available.');
      setLookupCode(null);
      return;
    }
    if (match.eligibility?.applicable === false) {
      setCodeLookupError(
        formatCouponIneligibilityHint(
          match.eligibility?.ineligibilityCodes,
          { ...match, eligibilityDays: data?.settings?.firstCouponEligibilityDays },
          cartSubtotalMinor
        ) || 'This coupon cannot be used on this order.'
      );
      setLookupCode(null);
      return;
    }
    setCodeLookupError('');
    if (multi) {
      const next = codesFromProps.includes(match.code)
        ? codesFromProps
        : [...codesFromProps, match.code];
      commitCodes(next);
    } else {
      commitCodes([match.code]);
    }
    setLookupCode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commit on lookup resolve only
  }, [lookupCode, coupons, isLoading, isFetching, multi, maxCouponsPerOrder, cartSubtotalMinor, data?.settings?.firstCouponEligibilityDays]);

  useEffect(() => {
    if (previewNotApplicable && previewFailureMessage) {
      setCodeLookupError(previewFailureMessage);
    }
  }, [previewNotApplicable, previewFailureMessage]);

  const handleApplyInput = () => {
    if (couponsBlocked || applying || codeIsApplied) return;
    const normalized = String(codeInput || '').trim().toUpperCase();
    if (!normalized) return;
    if (lookupCode) return;
    setCodeLookupError('');
    setLookupCode(normalized);
  };

  const handleSelect = (code) => {
    if (couponsBlocked || applying) return;
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return;
    setCodeInput(normalized);
    setCodeLookupError('');
    if (multi) {
      if (codesFromProps.includes(normalized)) return;
      if (codesFromProps.length >= maxCouponsPerOrder) {
        setCodeLookupError(`You can apply up to ${maxCouponsPerOrder} coupons.`);
        return;
      }
      commitCodes([...codesFromProps, normalized]);
    } else {
      commitCodes([normalized]);
    }
  };

  const handleClear = (code) => {
    if (multi && code) {
      const normalized = String(code).trim().toUpperCase();
      commitCodes(codesFromProps.filter((c) => c !== normalized));
    } else {
      commitCodes([]);
    }
    setCodeInput('');
    setLookupCode(null);
    setCodeLookupError('');
  };

  const autoCartNotice = autoCartApplied ? (
    <div
      className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5"
      role="status"
    >
      <p className="text-[12px] font-semibold text-emerald-900">
        {primaryApplied?.title
          ? `${primaryApplied.title} — ${formatInrFromMinor(autoCartDiscountMinor)} saved`
          : `Automatic discount applied — ${formatInrFromMinor(autoCartDiscountMinor)} off`}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/90">
        {primaryApplied?.message ||
          'This cart offer was applied automatically. No coupon code needed.'}
      </p>
      {primaryApplied?.kind === 'category_percent_off' && primaryApplied.categoryId ? (
        <Link
          href={categoryProductsHref(primaryApplied.categoryId)}
          className="mt-1.5 inline-block text-[11px] font-semibold text-emerald-900 underline underline-offset-2"
        >
          Shop more in {primaryApplied.categoryName || 'this category'}
        </Link>
      ) : null}
    </div>
  ) : null;

  const suggestedAutoNotice =
    suggestedAutoOffers.length > 0 ? (
      <div className="mb-3 space-y-2" role="status">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
          Category offers
        </p>
        {suggestedAutoOffers.map((offer) => {
          const pct = formatAutoCartOfferPercent(offer);
          const key = `${offer.kind}:${offer.categoryId || offer.promotionId || offer.title}`;
          return (
            <div
              key={key}
              className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5"
            >
              <p className="text-[12px] font-semibold text-amber-950">
                {offer.title || (pct ? `${pct} category offer` : 'Category offer')}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-amber-900/90">
                {offer.message || 'Add items from this category to unlock the offer.'}
              </p>
              {offer.categoryId ? (
                <Link
                  href={categoryProductsHref(offer.categoryId)}
                  className="mt-1.5 inline-block text-[11px] font-semibold text-amber-950 underline underline-offset-2"
                >
                  Browse {offer.categoryName || 'category'}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : null;

  if (couponsBlocked) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Tag size={16} className="h-4 w-4 text-amber-700" aria-hidden />
          <p className="text-[13px] font-medium text-amber-950">Coupons & offers</p>
        </div>
        {autoCartNotice}
        {suggestedAutoNotice}
        <p className="text-[12px] leading-snug text-amber-900" role="status">
          {couponsBlockedMessage || BXGY_COUPON_BLOCKED_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Tag size={16} className="h-4 w-4 text-violet-600" aria-hidden />
        <p className="text-[13px] font-medium text-gray-900">Coupons & offers</p>
        {multi && (
          <span className="text-[11px] text-gray-400">
            Up to {maxCouponsPerOrder}
          </span>
        )}
        {isPreviewLoading && (
          <Loader2 size={14} className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
        )}
      </div>

      {autoCartNotice}
      {suggestedAutoNotice}

      {suggestedCoupons.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <p className="w-full text-[11px] font-medium uppercase tracking-widest text-gray-400">
            Suggested
          </p>
          {suggestedCoupons.map((row) => (
            <SuggestedCouponChip
              key={row.code}
              code={row.code}
              applicable={row.applicable}
              applying={applying}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApplyInput();
            }
          }}
          placeholder="Enter coupon code"
          disabled={applying}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] font-mono uppercase tracking-wide text-gray-900 placeholder:normal-case placeholder:font-sans placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleApplyInput}
          disabled={applying || codeIsApplied || !normalizedInput}
          aria-busy={applying}
          className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition ${
            codeIsApplied
              ? 'cursor-default bg-emerald-600 disabled:opacity-100'
              : 'bg-violet-600 hover:bg-violet-700 disabled:opacity-50'
          }`}
        >
          {applying ? (
            <>
              <Loader2 size={14} className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Applying…
            </>
          ) : codeIsApplied ? (
            'Applied'
          ) : (
            'Apply'
          )}
        </button>
      </div>

      {codesFromProps.length > 0 && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
            previewApplied
              ? 'bg-emerald-50'
              : previewNotApplicable
                ? 'bg-red-50'
                : 'bg-amber-50'
          }`}
        >
          <p
            className={`text-[12px] ${
              previewApplied
                ? 'text-emerald-950'
                : previewNotApplicable
                  ? 'text-red-800'
                  : 'text-amber-900'
            }`}
            role={previewNotApplicable ? 'alert' : 'status'}
          >
            <span className="font-mono font-semibold">{codesFromProps.join(', ')}</span>
            {previewApplied ? (
              <>
                {' '}
                — Applied
                {previewDiscountLabel ? `, saves ${previewDiscountLabel} on this order` : ' on this order'}
              </>
            ) : previewNotApplicable && previewFailureMessage ? (
              <> — {previewFailureMessage}</>
            ) : applying || isPreviewLoading ? (
              <> — Applying…</>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => handleClear()}
            disabled={applying}
            className="text-[12px] font-medium text-violet-800 hover:text-violet-950 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      )}

      {(isLoading || isFetching) && !coupons.length && (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-[13px] text-gray-400">
          <Loader2 size={16} className="h-4 w-4 animate-spin" aria-hidden />
          Loading coupons…
        </div>
      )}

      {codeLookupError && (
        <p className="mt-3 text-[12px] text-red-600" role="alert">
          {codeLookupError}
        </p>
      )}

      {error && (
        <p className="mt-3 text-[12px] text-red-600">
          {error?.message || 'Could not load coupons. You can still enter a code above.'}
        </p>
      )}

      {promotionsPaused && (
        <p className="mt-3 text-[12px] text-gray-500">Promotions are temporarily paused for this shop.</p>
      )}

      {!promotionsPaused && sortedCoupons.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
            Available coupons
          </p>
          {sortedCoupons.map((coupon) => (
            <CouponRow
              key={coupon.id || coupon.code}
              coupon={coupon}
              cartSubtotalMinor={cartSubtotalMinor}
              selected={codesFromProps.includes(String(coupon.code).toUpperCase())}
              applied={
                previewApplied &&
                String(coupon.code).toUpperCase() === primaryCode
              }
              applying={applying}
              onSelect={handleSelect}
              onClear={handleClear}
              eligibilityDays={data?.settings?.firstCouponEligibilityDays}
              applyFailure={
                previewNotApplicable &&
                String(coupon.code).toUpperCase() === String(primaryCode).toUpperCase()
                  ? previewFailureMessage
                  : null
              }
            />
          ))}
        </div>
      )}

      {!isLoading && !promotionsPaused && !error && sortedCoupons.length === 0 && (
        <p className="mt-3 text-[12px] text-gray-500">
          No coupons available right now. Enter a code if you have one.
        </p>
      )}
    </div>
  );
}
