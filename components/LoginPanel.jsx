'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@heroui/react';
import { useWebOtp } from '../hooks/useWebOtp';
import { useAuth } from '../context/AuthContext';
import IndianPhoneInput from './IndianPhoneInput';
import {
  resolveShopId,
  getShopIdConfigError,
  normalizeSession,
  requestOtp,
  verifyOtp,
  normalizePhoneForApi,
  formatPhoneForDisplay,
} from '../utils/authApi';
import { persistAccessToken } from '../utils/apiClient';
import { normalizeOtpCodeInput } from '../utils/otpVerifyPayload';
import { sanitizeIndianPhoneInput } from '../utils/indianPhone';
import { otpSchema, validateLoginPhone, firstZodIssueMessage } from '../lib/validations/auth.schema';
import { BRAND_PRIMARY_BTN_FULL } from './ui/brandButton';

const fieldClass =
  'h-[52px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[16px] text-gray-900 transition placeholder:text-gray-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20';

const OTP_RATE_LIMIT_COOLDOWN_SEC = 5 * 60;

function otpRateLimitStorageKey({ shopId, phone }) {
  const s = String(shopId || '').trim() || 'unknown-shop';
  const p = String(phone || '').trim() || 'unknown-phone';
  return `yaadro_otp_rate_limit_until_v1:${s}:${p}`;
}

function readOtpRateLimitUntilMs({ shopId, phone }) {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(otpRateLimitStorageKey({ shopId, phone }));
    const ms = raw ? Number(raw) : 0;
    return Number.isFinite(ms) ? ms : 0;
  } catch {
    return 0;
  }
}

function writeOtpRateLimitUntilMs({ shopId, phone, untilMs }) {
  if (typeof window === 'undefined') return;
  try {
    if (!untilMs) {
      window.localStorage.removeItem(otpRateLimitStorageKey({ shopId, phone }));
      return;
    }
    window.localStorage.setItem(otpRateLimitStorageKey({ shopId, phone }), String(untilMs));
  } catch {
    /* ignore */
  }
}

function isTooManyOtpRequestsError(err) {
  const status = err?.status;
  if (status === 429) return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('too many') || msg.includes('rate limit') || msg.includes('try again later');
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-[12px] text-red-700">{message}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  loading,
  loadingText,
  onClick,
  type = 'button',
}) {
  return (
    <Button
      type={type}
      variant="primary"
      isDisabled={disabled || loading}
      isLoading={loading}
      onPress={onClick}
      className={BRAND_PRIMARY_BTN_FULL}
    >
      {loading ? loadingText : children}
    </Button>
  );
}

function SecondaryButton({ children, disabled, onClick }) {
  return (
    <Button
      variant="ghost"
      isDisabled={disabled}
      onPress={onClick}
      className="h-[48px] w-full rounded-full border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
    >
      {children}
    </Button>
  );
}

function PhoneStep({ phone, setPhone, onSubmit, isSubmitting, inputRef, otpCooldownSecondsLeft = 0 }) {
  const handlePhoneKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
    if (isSubmitting) return;
    const form = e.currentTarget.form;
    if (!form) return;
    e.preventDefault();
    try {
      form.requestSubmit();
    } catch {
      /* submit disabled while loading */
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <label htmlFor="login-phone" className="mb-2 block text-[13px] font-medium text-gray-800">
        Mobile number
      </label>
      <IndianPhoneInput
        ref={inputRef}
        id="login-phone"
        value={phone}
        onChange={setPhone}
        onKeyDown={handlePhoneKeyDown}
        showValidHint={false}
        className="mb-6"
        inputClassName={fieldClass}
      />
      <PrimaryButton
        type="submit"
        loading={isSubmitting}
        loadingText="Sending…"
        disabled={otpCooldownSecondsLeft > 0}
      >
        {otpCooldownSecondsLeft > 0 ? `Send OTP in ${otpCooldownSecondsLeft}s` : 'Send OTP'}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </PrimaryButton>
    </form>
  );
}

function OtpStep({
  phone,
  code,
  setCode,
  onSubmit,
  onResend,
  onChangePhone,
  isSubmitting,
  inputRef,
  resendSecondsLeft = 0,
  otpCooldownSecondsLeft = 0,
}) {
  const resendDisabled = isSubmitting || resendSecondsLeft > 0 || otpCooldownSecondsLeft > 0;
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-800">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        OTP sent
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="login-otp" className="text-[13px] font-medium text-gray-800">
          Code sent to <span className="font-semibold text-gray-900">{phone}</span>
        </label>
        <button
          type="button"
          onClick={onChangePhone}
          className="shrink-0 text-[12px] font-semibold text-violet-600 hover:text-violet-800"
        >
          Change
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        id="login-otp"
        value={code}
        onChange={(e) => setCode(normalizeOtpCodeInput(e.target.value).slice(0, 8))}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Enter OTP"
        name="one-time-code"
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        required
        className={`${fieldClass} mb-4 text-center text-[22px] font-semibold tracking-[0.35em] placeholder:text-sm placeholder:font-normal placeholder:tracking-normal`}
      />

      <p className="mb-5 text-center text-[11px] leading-relaxed text-gray-500">
        On supported phones, the code may fill automatically from your SMS.
      </p>

      <div className="space-y-3">
        <PrimaryButton type="submit" loading={isSubmitting} loadingText="Verifying…">
          Verify &amp; continue
        </PrimaryButton>
        <SecondaryButton onClick={onResend} disabled={resendDisabled}>
          {otpCooldownSecondsLeft > 0
            ? `Resend OTP in ${otpCooldownSecondsLeft}s`
            : resendSecondsLeft > 0
              ? `Resend OTP in ${resendSecondsLeft}s`
              : 'Resend OTP'}
        </SecondaryButton>
      </div>
    </form>
  );
}

/** Mobile OTP login — fields sit directly on the login page (no inner card). */
export default function LoginPanel({ className = '' }) {
  const { login } = useAuth();
  const phoneInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [shopId, setShopId] = useState('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [otpCooldownSecondsLeft, setOtpCooldownSecondsLeft] = useState(0);

  const OTP_RESEND_COOLDOWN_SEC = 30;

  useEffect(() => {
    if (resendSecondsLeft <= 0) return undefined;
    const t = setInterval(() => {
      setResendSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSecondsLeft]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const nextPhone = normalizePhoneForApi(phone);
    const untilMs = readOtpRateLimitUntilMs({ shopId, phone: nextPhone });
    const tick = () => {
      const msLeft = untilMs - Date.now();
      const secondsLeft = msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
      setOtpCooldownSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        writeOtpRateLimitUntilMs({ shopId, phone: nextPhone, untilMs: 0 });
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [shopId, phone]);

  useEffect(() => {
    let active = true;
    async function hydrateShopId() {
      const resolved = await resolveShopId();
      if (active) setShopId(resolved || '');
    }
    hydrateShopId();
    return () => {
      active = false;
    };
  }, []);

  const clearError = () => setError('');

  const ensureShopId = async () => {
    const resolved = await resolveShopId();
    const id = resolved ? String(resolved).trim() : '';
    if (id) {
      if (id !== shopId) setShopId(id);
      return id;
    }
    setError(getShopIdConfigError());
    return '';
  };

  useEffect(() => {
    const ref = step === 'phone' ? phoneInputRef : otpInputRef;
    const t = setTimeout(() => ref.current?.focus?.(), 80);
    return () => clearTimeout(t);
  }, [step]);

  const applyOtpFromSms = useCallback((digits) => {
    setCode(normalizeOtpCodeInput(digits).slice(0, 8));
    clearError();
  }, []);

  const { begin: beginWebOtp, cancel: cancelWebOtp } = useWebOtp(applyOtpFromSms, {
    timeoutMs: 120000,
    maxLength: 8,
  });

  useEffect(() => {
    if (step !== 'otp') cancelWebOtp();
  }, [step, cancelWebOtp]);

  const apiPhone = () => normalizePhoneForApi(phone);
  const displayPhone = () => formatPhoneForDisplay(phone);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearError();
    const resolvedShopId = await ensureShopId();
    if (!resolvedShopId) return;
    const nextPhone = apiPhone();
    const phoneErr = validateLoginPhone(sanitizeIndianPhoneInput(phone));
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    beginWebOtp();

    setIsSubmitting(true);
    try {
      if (otpCooldownSecondsLeft > 0) return;
      await requestOtp({ phone: nextPhone, shopId: resolvedShopId });
      setStep('otp');
      setResendSecondsLeft(OTP_RESEND_COOLDOWN_SEC);
      writeOtpRateLimitUntilMs({ shopId: resolvedShopId, phone: nextPhone, untilMs: 0 });
    } catch (err) {
      cancelWebOtp();
      if (isTooManyOtpRequestsError(err)) {
        const untilMs = Date.now() + OTP_RATE_LIMIT_COOLDOWN_SEC * 1000;
        writeOtpRateLimitUntilMs({ shopId: resolvedShopId, phone: nextPhone, untilMs });
        setError('Too many OTP requests. Please wait 5 minutes and try again.');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();
    const resolvedShopId = await ensureShopId();
    if (!resolvedShopId) return;
    const nextPhone = apiPhone();
    const phoneErr = validateLoginPhone(sanitizeIndianPhoneInput(phone));
    if (phoneErr) {
      setError(phoneErr);
      setStep('phone');
      return;
    }
    const nextCode = normalizeOtpCodeInput(code);
    const otpErr = firstZodIssueMessage(otpSchema.safeParse(nextCode));
    if (otpErr) {
      setError(otpErr);
      return;
    }
    cancelWebOtp();
    setIsSubmitting(true);
    try {
      const session = await verifyOtp({ phone: nextPhone, shopId: resolvedShopId, code: nextCode });
      const { user, token, refreshToken } = normalizeSession(session);
      if (!token) throw new Error('Invalid response from server.');

      const mergedUser =
        user && typeof user === 'object'
          ? { ...user, phone: user.phone || user.mobile || nextPhone }
          : { phone: nextPhone };

      if (typeof window !== 'undefined') {
        persistAccessToken(token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }

      login(mergedUser, { token, refreshToken });
    } catch (err) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendSecondsLeft > 0 || otpCooldownSecondsLeft > 0 || isSubmitting) return;
    clearError();
    const resolvedShopId = await ensureShopId();
    if (!resolvedShopId) return;
    const nextPhone = apiPhone();
    const phoneErr = validateLoginPhone(sanitizeIndianPhoneInput(phone));
    if (phoneErr) {
      setError(phoneErr);
      setStep('phone');
      return;
    }

    beginWebOtp();

    setIsSubmitting(true);
    try {
      await requestOtp({ phone: nextPhone, shopId: resolvedShopId });
      setResendSecondsLeft(OTP_RESEND_COOLDOWN_SEC);
      writeOtpRateLimitUntilMs({ shopId: resolvedShopId, phone: nextPhone, untilMs: 0 });
    } catch (err) {
      cancelWebOtp();
      if (isTooManyOtpRequestsError(err)) {
        const untilMs = Date.now() + OTP_RATE_LIMIT_COOLDOWN_SEC * 1000;
        writeOtpRateLimitUntilMs({ shopId: resolvedShopId, phone: nextPhone, untilMs });
        setError('Too many OTP requests. Please wait 5 minutes and try again.');
      } else {
        setError(err?.message || 'Could not resend OTP.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <div className="mb-5 flex justify-center px-2">
        <Image
          src="/images/login-image.png"
          alt=""
          width={320}
          height={320}
          className="h-auto w-[min(78vw,240px)] max-h-[200px] object-contain select-none sm:w-[280px] sm:max-h-[230px] md:max-h-[250px]"
          priority
          unoptimized
        />
      </div>

      <div className="mb-6 text-center">
        <h2 className="font-headingnow text-[2.25rem] font-extrabold leading-[0.95] text-gray-900 sm:text-5xl md:text-6xl">
          Welcome back
        </h2>
        <p className="mx-auto mt-3 max-w-[340px] text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
          {step === 'phone'
            ? 'Sign in to grab your basket and continue shopping fresh, fast, and hassle-free.'
            : 'Enter the code we sent to your phone to unlock your basket.'}
        </p>
      </div>

      <ErrorBox message={error} />

      {step === 'phone' ? (
        <PhoneStep
          phone={phone}
          setPhone={(v) => {
            setPhone(v);
            clearError();
          }}
          onSubmit={handleRequestOtp}
          isSubmitting={isSubmitting}
          inputRef={phoneInputRef}
          otpCooldownSecondsLeft={otpCooldownSecondsLeft}
        />
      ) : (
        <OtpStep
          phone={displayPhone()}
          code={code}
          setCode={(v) => {
            setCode(v);
            clearError();
          }}
          onSubmit={handleVerifyOtp}
          onResend={handleResend}
          onChangePhone={() => {
            cancelWebOtp();
            setStep('phone');
            setCode('');
            setResendSecondsLeft(0);
            clearError();
          }}
          isSubmitting={isSubmitting}
          inputRef={otpInputRef}
          resendSecondsLeft={resendSecondsLeft}
          otpCooldownSecondsLeft={otpCooldownSecondsLeft}
        />
      )}
    </div>
  );
}
