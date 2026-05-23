'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Web OTP API (Chrome Android). SMS must include a domain binding line, e.g.:
 *   Your code is 123456
 *   @yourshop.com #123456
 *
 * Call `begin()` in the same user gesture as "Send OTP" (before awaiting the network),
 * otherwise the browser will not show the SMS picker.
 *
 * iOS uses `autocomplete="one-time-code"` on the input; this hook no-ops there.
 *
 * @param {(code: string) => void} onCode
 * @param {{ timeoutMs?: number, maxLength?: number }} [options]
 */
export function useWebOtp(onCode, options = {}) {
  const { timeoutMs = 120000, maxLength = 8 } = options;
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const cancel = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const begin = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('OTPCredential' in window)) return;

    cancel();

    const ac = new AbortController();
    abortRef.current = ac;
    timerRef.current = window.setTimeout(() => ac.abort(), timeoutMs);

    void (async () => {
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
        /* dismissed, timeout, or SMS missing @origin #code line */
      } finally {
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
      }
    })();
  }, [cancel, timeoutMs, maxLength]);

  useEffect(() => () => cancel(), [cancel]);

  return { begin, cancel };
}

/** @deprecated Use `useWebOtp` and call `begin()` on Send OTP — enabled-only effect loses user activation. */
export function useWebOtpOnMount(enabled, onCode, options) {
  const { begin, cancel } = useWebOtp(onCode, options);
  useEffect(() => {
    if (enabled) begin();
    else cancel();
  }, [enabled, begin, cancel]);
  return { begin, cancel };
}
