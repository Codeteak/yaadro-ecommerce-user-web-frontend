'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loading2Regular as Loader2, TagRegular as Tag } from './icons';
import { useStorefrontCoupons } from '../hooks/useCoupons';
import {
  formatCouponBenefitLabel,
  formatCouponMinCartHint,
} from '../utils/storefrontCouponsApi';
import {
  formatCartCouponPreviewMessage,
  formatCouponIneligibilityHint,
  isCartCouponPreviewApplied,
} from '../utils/cartPromotions';
import { formatInrFromMinor } from '../utils/currencyMinor';

function CouponRow({ coupon, cartSubtotalMinor, selected, onSelect, onClear, multi }) {
  const applicable = coupon.eligibility?.applicable !== false;
  const benefit =
    coupon.benefits?.length > 0 ? formatCouponBenefitLabel(coupon.benefits[0]) : 'Special offer';
  const minHint = formatCouponMinCartHint(coupon, cartSubtotalMinor);
  const ineligibleHint = !applicable
    ? formatCouponIneligibilityHint(coupon.eligibility?.ineligibilityCodes)
    : null;
  const title = coupon.promotionName || benefit;

  return (
    <button
      type="button"
      disabled={!applicable}
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
                {multi ? 'Applied' : 'Selected'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] font-medium text-gray-900 line-clamp-1">{title}</p>
          <p className="text-[12px] text-gray-500">{benefit}</p>
          {minHint && <p className="mt-1 text-[11px] font-medium text-amber-700">{minHint}</p>}
          {ineligibleHint && !minHint && (
            <p className="mt-1 text-[11px] font-medium text-amber-700">{ineligibleHint}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function SuggestedCouponChip({ code, applicable, onSelect }) {
  return (
    <button
      type="button"
      disabled={!applicable}
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
  enabled = true,
}) {
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
    enabled: enabled && cartSubtotalMinor != null,
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
    if (!lookupCode || isLoading || isFetching) return;
    const match = coupons.find(
      (c) => String(c.code).toUpperCase() === String(lookupCode).toUpperCase()
    );
    if (!match) {
      setCodeLookupError('This coupon code is not available.');
      return;
    }
    if (match.eligibility?.applicable === false) {
      setCodeLookupError(
        formatCouponIneligibilityHint(match.eligibility?.ineligibilityCodes) ||
          'This coupon cannot be used on this order.'
      );
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
  }, [lookupCode, coupons, isLoading, isFetching, multi, maxCouponsPerOrder]);

  const handleApplyInput = () => {
    const normalized = String(codeInput || '').trim().toUpperCase();
    if (!normalized) return;
    setCodeLookupError('');
    setLookupCode(normalized);
  };

  const handleSelect = (code) => {
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
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] font-mono uppercase tracking-wide text-gray-900 placeholder:normal-case placeholder:font-sans placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleApplyInput}
          disabled={!String(codeInput || '').trim()}
          className="flex-shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40"
        >
          Apply
        </button>
      </div>

      {codesFromProps.length > 0 && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
            previewApplied
              ? 'bg-violet-50'
              : previewNotApplicable
                ? 'bg-red-50'
                : 'bg-amber-50'
          }`}
        >
          <p
            className={`text-[12px] ${
              previewApplied
                ? 'text-violet-900'
                : previewNotApplicable
                  ? 'text-red-800'
                  : 'text-amber-900'
            }`}
            role={previewNotApplicable ? 'alert' : undefined}
          >
            <span className="font-mono font-semibold">{codesFromProps.join(', ')}</span>
            {previewApplied && previewDiscountLabel ? (
              <>
                {' '}
                — saves {previewDiscountLabel} on this order
              </>
            ) : previewNotApplicable && previewFailureMessage ? (
              <> — {previewFailureMessage}</>
            ) : isPreviewLoading ? (
              <> — checking coupon…</>
            ) : (
              <> — previewing discount…</>
            )}
          </p>
          <button
            type="button"
            onClick={() => handleClear()}
            className="text-[12px] font-medium text-violet-800 hover:text-violet-950"
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
              onSelect={handleSelect}
              onClear={handleClear}
              multi={multi}
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
