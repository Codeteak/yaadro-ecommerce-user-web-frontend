'use client';

import { forwardRef, useState } from 'react';
import { getIndianPhoneLiveError, isValidIndianMobile, sanitizeIndianPhoneInput } from '../utils/indianPhone';
import { indianMobileSchema } from '../lib/validations/auth.schema';

function nationalDigitsAttempt(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/**
 * 10-digit Indian mobile field with live validation (first digit 6–9).
 */
const IndianPhoneInput = forwardRef(function IndianPhoneInput(
  {
    value,
    onChange,
    id,
    className = '',
    inputClassName = '',
    placeholder = '9876543210',
    disabled = false,
    required = false,
    autoComplete = 'tel-national',
    showHint = true,
    showValidHint = true,
    errorHintClassName = 'mt-1.5 text-[12px] text-red-600',
    successHintClassName = 'mt-1.5 text-[12px] text-violet-700',
    'aria-label': ariaLabel,
    onBlur,
    onFocus,
    onKeyDown,
  },
  ref
) {
  const digits = sanitizeIndianPhoneInput(value);
  const parsed = digits ? indianMobileSchema.safeParse(digits) : null;
  const schemaError = parsed && !parsed.success ? parsed.error.issues[0]?.message : null;
  const liveError = getIndianPhoneLiveError(digits) || (digits.length === 10 ? schemaError : null);
  const isComplete = isValidIndianMobile(digits);
  const [rejectHint, setRejectHint] = useState(null);

  const handleChange = (e) => {
    const raw = e.target.value;
    const cleaned = sanitizeIndianPhoneInput(raw);
    const attempt = nationalDigitsAttempt(raw);
    if (attempt.length > 0 && cleaned.length === 0) {
      setRejectHint('Mobile number must start with 6, 7, 8, or 9');
    } else {
      setRejectHint(null);
    }
    onChange(cleaned);
  };

  const displayError = rejectHint || liveError;

  return (
    <div className={className || undefined}>
      <input
        ref={ref}
        type="tel"
        id={id}
        value={digits}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode="numeric"
        maxLength={10}
        aria-label={ariaLabel || 'Mobile number'}
        aria-invalid={displayError ? 'true' : undefined}
        className={
          inputClassName ||
          `w-full h-[46px] px-4 rounded-xl border-[1.5px] text-[14px] text-gray-900 bg-gray-50 focus:outline-none focus:bg-white transition placeholder-gray-400 ${
            displayError
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
              : isComplete
                ? 'border-violet-400 focus:border-violet-500'
                : 'border-gray-200 focus:border-violet-500'
          }`
        }
      />
      {showHint && displayError && (
        <p className={errorHintClassName} role="alert">
          {displayError}
        </p>
      )}
      {showHint && showValidHint && isComplete && !displayError && (
        <p className={successHintClassName}>Valid mobile number</p>
      )}
    </div>
  );
});

export default IndianPhoneInput;
