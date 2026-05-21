'use client';

import { useEffect, useRef } from 'react';

/**
 * Chrome Android Web OTP API — fills OTP from SMS when the message includes a
 * domain binding line (see https://web.dev/web-otp/). Example last line of SMS:
 *
 *   @yourshop.com #123456
 *
 * The origin must match the page (including port on localhost). iOS uses
 * `autocomplete="one-time-code"` on the input instead; this hook no-ops there.
 *
 * @param {boolean} enabled — e.g. OTP step is visible
 * @param {(code: string) => void} onCode — receives digits only, max length from options
 * @param {{ timeoutMs?: number, maxLength?: number }} [options]
 */
export function useWebOtp(enabled, onCode, options = {}) {
  const { timeoutMs = 120000, maxLength = 6 } = options;
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    if (!('OTPCredential' in window)) return undefined;

    const ac = new AbortController();
    const timerId = window.setTimeout(() => ac.abort(), timeoutMs);

    (async () => {
      try {
        const otp = await navigator.credentials.get({
          otp: { transport: ['sms'] },
          signal: ac.signal,
        });
        const raw = otp && typeof otp.code === 'string' ? otp.code : '';
        const digits = raw.replace(/\D/g, '').slice(0, maxLength);
        if (digits.length > 0) {
          onCodeRef.current(digits);
        }
      } catch {
        /* user dismissed, timeout, wrong origin in SMS, or not supported */
      }
    })();

    return () => {
      window.clearTimeout(timerId);
      ac.abort();
    };
  }, [enabled, timeoutMs, maxLength]);
}
