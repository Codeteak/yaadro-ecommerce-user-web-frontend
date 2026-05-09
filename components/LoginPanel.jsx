'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import {
  resolveShopId,
  normalizeSession,
  requestOtp,
  verifyOtp,
  normalizeOtpPhone,
  updateProfile,
} from '../utils/authApi';

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">
      <svg className="w-3.5 h-3.5 text-red-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-[12px] text-red-700">{message}</p>
    </div>
  );
}

function PrimaryButton({ children, disabled, loading, loadingText, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full h-[46px] rounded-full text-[14px] font-medium flex items-center justify-center gap-2 transition ${
        disabled || loading
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
      }`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function SecondaryButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-[44px] rounded-full border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Illustration() {
  return (
    <div className="flex flex-col items-center mb-5">
      <div className="relative mb-4 flex w-full max-w-[280px] items-center justify-center px-2">
        <Image
          src="/trolley.png"
          alt="Shopping cart"
          width={560}
          height={560}
          className="h-[148px] w-auto max-h-[42vmin] sm:h-[180px] md:h-[200px] object-contain object-center select-none"
          priority
          sizes="(max-width: 640px) 72vw, 280px"
        />
      </div>
      <p className="text-[13px] text-gray-400 text-center max-w-[220px] leading-relaxed">
        Sign in to continue shopping fresh, fast, and hassle-free.
      </p>
    </div>
  );
}

function PhoneStep({ phone, setPhone, onSubmit, isSubmitting, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <label htmlFor="login-phone" className="block text-[12px] font-medium text-gray-700 mb-1.5">
        Mobile number
      </label>
      <input
        ref={inputRef}
        type="tel"
        id="login-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 9876543210"
        autoComplete="tel"
        inputMode="tel"
        required
        className="mb-4 w-full h-[46px] px-4 rounded-xl border-[1.5px] border-gray-200 text-[14px] text-gray-900 bg-gray-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition placeholder-gray-400"
      />
      <PrimaryButton type="submit" loading={isSubmitting} loadingText="Sending…">
        Send OTP
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </PrimaryButton>
    </form>
  );
}

function OtpStep({ phone, code, setCode, onSubmit, onResend, onChangePhone, isSubmitting, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 mb-3">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        OTP sent
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="login-otp" className="text-[12px] font-medium text-gray-700">
          OTP sent to{' '}
          <span className="text-gray-900 font-medium">{phone}</span>
        </label>
        <button
          type="button"
          onClick={onChangePhone}
          className="text-[12px] font-medium text-emerald-600 hover:text-emerald-800 transition"
        >
          Change
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        id="login-otp"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        placeholder="● ● ● ● ● ●"
        autoComplete="one-time-code"
        required
        className="w-full h-[52px] px-4 rounded-xl border-[1.5px] border-gray-200 text-[22px] font-medium text-gray-900 bg-gray-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-center tracking-[.3em] placeholder-gray-300"
      />

      <div className="mt-4 space-y-2.5">
        <PrimaryButton type="submit" loading={isSubmitting} loadingText="Verifying…">
          Verify &amp; continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </PrimaryButton>

        <SecondaryButton onClick={onResend} disabled={isSubmitting}>
          Resend OTP
        </SecondaryButton>
      </div>
    </form>
  );
}

/** Mobile OTP login — used on `/login`. Post-login redirect uses {@link takePostLoginRedirect} in `AuthContext.login`. */
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

  const ensureShopId = () => {
    if (!shopId) {
      setError('Missing shop ID. Set NEXT_PUBLIC_SHOP_ID in your environment.');
      return false;
    }
    return true;
  };

  useEffect(() => {
    const ref = step === 'phone' ? phoneInputRef : otpInputRef;
    const t = setTimeout(() => ref.current?.focus?.(), 80);
    return () => clearTimeout(t);
  }, [step]);

  const normalizedPhone = () => normalizeOtpPhone(phone);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!ensureShopId()) return;
    const nextPhone = normalizedPhone();
    if (!nextPhone) {
      setError('Please enter your mobile number.');
      return;
    }
    const digits = nextPhone.replace(/\D/g, '');
    if (!nextPhone.startsWith('+91') || digits.length !== 12) {
      setError('Enter a valid Indian mobile number (10 digits, or include +91).');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestOtp({ phone: nextPhone, shopId });
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!ensureShopId()) return;
    const nextPhone = normalizedPhone();
    const nextCode = code.trim();
    if (!nextPhone) {
      setError('Please enter your mobile number.');
      return;
    }
    const phoneDigits = nextPhone.replace(/\D/g, '');
    if (!nextPhone.startsWith('+91') || phoneDigits.length !== 12) {
      setError('Enter a valid Indian mobile number (10 digits, or include +91).');
      setStep('phone');
      return;
    }
    if (!/^\d{6}$/.test(nextCode)) {
      setError('Enter the 6-digit OTP from your SMS.');
      return;
    }
    setIsSubmitting(true);
    try {
      const session = await verifyOtp({ phone: nextPhone, shopId, code: nextCode });
      const { user, token, refreshToken } = normalizeSession(session);
      if (!token) throw new Error('Invalid response from server.');

      const mergedUser =
        user && typeof user === 'object'
          ? { ...user, phone: user.phone || user.mobile || nextPhone }
          : { phone: nextPhone };

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('authToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      }

      let syncedUser = null;
      try {
        syncedUser = await updateProfile({ phone: nextPhone });
      } catch (syncErr) {
        console.warn('Could not sync phone to profile:', syncErr?.message || syncErr);
      }

      const userForLogin =
        syncedUser && typeof syncedUser === 'object'
          ? { ...mergedUser, ...syncedUser, phone: syncedUser.phone || nextPhone }
          : mergedUser;

      login(userForLogin, { token, refreshToken });
    } catch (err) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    clearError();
    const nextPhone = normalizedPhone();
    if (!nextPhone) {
      setError('Please enter your mobile number.');
      return;
    }
    const rd = nextPhone.replace(/\D/g, '');
    if (!nextPhone.startsWith('+91') || rd.length !== 12) {
      setError('Enter a valid Indian mobile number (10 digits, or include +91).');
      setStep('phone');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestOtp({ phone: nextPhone, shopId });
    } catch (err) {
      setError(err?.message || 'Could not resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`px-5 pb-8 pt-2 ${className}`.trim()}>
      <ErrorBox message={error} />
      <Illustration />

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
        />
      ) : (
        <OtpStep
          phone={normalizedPhone()}
          code={code}
          setCode={(v) => {
            setCode(v);
            clearError();
          }}
          onSubmit={handleVerifyOtp}
          onResend={handleResend}
          onChangePhone={() => {
            setStep('phone');
            setCode('');
            clearError();
          }}
          isSubmitting={isSubmitting}
          inputRef={otpInputRef}
        />
      )}
    </div>
  );
}
