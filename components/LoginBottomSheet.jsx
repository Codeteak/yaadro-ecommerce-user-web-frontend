'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getShopIdFromEnv,
  normalizeSession,
  requestEmailOtp,
  verifyEmailOtp,
  startGoogleOAuth,
} from '../utils/authApi';

/* ─────────────────────────────────────────────
   Small helpers
───────────────────────────────────────────── */

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

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] text-gray-400">or</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Illustration
───────────────────────────────────────────── */
function Illustration() {
  return (
    <div className="flex flex-col items-center mb-5">
      <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <p className="text-[13px] text-gray-400 text-center max-w-[220px] leading-relaxed">
        Sign in to continue shopping fresh, fast, and hassle-free.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Google button
───────────────────────────────────────────── */
function GoogleButton({ onClick, loading, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full h-[46px] rounded-full border border-gray-200 bg-white text-[13px] font-medium text-gray-800 flex items-center justify-center gap-2.5 hover:bg-gray-50 transition disabled:opacity-40"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          Redirecting to Google…
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Phone step
───────────────────────────────────────────── */
function EmailStep({ email, setEmail, onSubmit, isSubmitting, oauthLoading, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <label htmlFor="email" className="block text-[12px] font-medium text-gray-700 mb-1.5">
        Email address
      </label>
      <input
        ref={inputRef}
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        required
        className="w-full h-[46px] px-4 rounded-xl border-[1.5px] border-gray-200 text-[14px] text-gray-900 bg-gray-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition placeholder-gray-400"
      />
      <p className="text-[11px] text-gray-400 mt-1.5 mb-4">
        We'll send you a one-time password.
      </p>
      <PrimaryButton
        type="submit"
        loading={isSubmitting}
        loadingText="Sending…"
        disabled={oauthLoading}
      >
        Send OTP
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </PrimaryButton>
    </form>
  );
}

/* ─────────────────────────────────────────────
   OTP step
───────────────────────────────────────────── */
function OtpStep({ email, code, setCode, onSubmit, onResend, onChangeEmail, isSubmitting, oauthLoading, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      {/* Sent badge */}
      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 mb-3">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        OTP sent
      </div>

      {/* Email + change */}
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="otp" className="text-[12px] font-medium text-gray-700">
          OTP sent to{' '}
          <span className="text-gray-900 font-medium">{email}</span>
        </label>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-[12px] font-medium text-emerald-600 hover:text-emerald-800 transition"
        >
          Change
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        id="otp"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        placeholder="● ● ● ● ● ●"
        autoComplete="one-time-code"
        required
        className="w-full h-[52px] px-4 rounded-xl border-[1.5px] border-gray-200 text-[22px] font-medium text-gray-900 bg-gray-50 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-center tracking-[.3em] placeholder-gray-300"
      />

      <div className="mt-4 space-y-2.5">
        <PrimaryButton
          type="submit"
          loading={isSubmitting}
          loadingText="Verifying…"
          disabled={oauthLoading}
        >
          Verify &amp; continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </PrimaryButton>

        <SecondaryButton onClick={onResend} disabled={isSubmitting || oauthLoading}>
          Resend OTP
        </SecondaryButton>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Sheet inner content (shared by mobile + desktop)
───────────────────────────────────────────── */
function SheetContent({ onClose }) {
  const { login } = useAuth();
  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const shopId = getShopIdFromEnv();

  const clearError = () => setError('');

  const ensureShopId = () => {
    if (!shopId) {
      setError('Missing shop ID. Set NEXT_PUBLIC_SHOP_ID in your environment.');
      return false;
    }
    return true;
  };

  /* ── Focus management ── */
  useEffect(() => {
    const ref = step === 'email' ? emailInputRef : otpInputRef;
    const t = setTimeout(() => ref.current?.focus?.(), 80);
    return () => clearTimeout(t);
  }, [step]);

  /* ── Send OTP ── */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!ensureShopId()) return;
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) { setError('Please enter your email address.'); return; }
    setIsSubmitting(true);
    try {
      await requestEmailOtp({ email: nextEmail, shopId });
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!ensureShopId()) return;
    const nextEmail = email.trim().toLowerCase();
    const nextCode = code.trim();
    if (!nextEmail) { setError('Please enter your email address.'); return; }
    if (!nextCode || nextCode.length < 4) { setError('Please enter the OTP code.'); return; }
    setIsSubmitting(true);
    try {
      const session = await verifyEmailOtp({ email: nextEmail, shopId, code: nextCode });
      const { user, token, refreshToken } = normalizeSession(session);
      if (!token) throw new Error('Invalid response from server.');
      login(user || { email: nextEmail }, { token, refreshToken });
      onClose();
    } catch (err) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    clearError();
    setIsSubmitting(true);
    try {
      await requestEmailOtp({ email: email.trim().toLowerCase(), shopId });
    } catch (err) {
      setError(err?.message || 'Could not resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    clearError();
    if (!ensureShopId()) return;
    setOauthLoading(true);
    try {
      const callbackURL = `${window.location.origin}/auth/oauth/complete`;
      const url = await startGoogleOAuth(callbackURL, shopId);
      window.location.assign(url);
    } catch (err) {
      setError(err?.message || 'Could not start Google sign-in.');
      setOauthLoading(false);
    }
  };

  return (
    <div className="px-5 pb-6 pt-4">
      <ErrorBox message={error} />
      <Illustration />

      {step === 'email' ? (
        <EmailStep
          email={email}
          setEmail={(v) => { setEmail(v); clearError(); }}
          onSubmit={handleRequestOtp}
          isSubmitting={isSubmitting}
          oauthLoading={oauthLoading}
          inputRef={emailInputRef}
        />
      ) : (
        <OtpStep
          email={email.trim().toLowerCase()}
          code={code}
          setCode={(v) => { setCode(v); clearError(); }}
          onSubmit={handleVerifyOtp}
          onResend={handleResend}
          onChangeEmail={() => { setStep('email'); setCode(''); clearError(); }}
          isSubmitting={isSubmitting}
          oauthLoading={oauthLoading}
          inputRef={otpInputRef}
        />
      )}

      <Divider />

      <GoogleButton
        onClick={handleGoogle}
        loading={oauthLoading}
        disabled={isSubmitting}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Header (shared)
───────────────────────────────────────────── */
function SheetHeader({ onClose }) {
  return (
    <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
      <div>
        <h2 className="text-[17px] font-medium text-gray-900">Sign in</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Use email OTP or continue with Google.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition mt-0.5 flex-shrink-0"
        aria-label="Close"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export default function LoginBottomSheet({ isOpen, onClose }) {

  /* ── Scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[70]"
        style={{ backdropFilter: 'none' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Mobile: bottom sheet ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[71] bg-white rounded-t-3xl overflow-hidden"
        style={{
          maxHeight: '92vh',
          animation: 'slideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <SheetHeader onClose={onClose} />

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 80px)' }}>
          <SheetContent onClose={onClose} />
        </div>
      </div>

      {/* ── Desktop: centered modal ── */}
      <div
        className="hidden md:flex fixed inset-0 z-[71] items-center justify-center px-4"
      >
        <div
          className="bg-white rounded-3xl w-full max-w-[400px] overflow-hidden"
          style={{ animation: 'scaleIn 0.25s cubic-bezier(0.32, 0.72, 0, 1) both' }}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetHeader onClose={onClose} />
          <div className="overflow-y-auto max-h-[80vh]">
            <SheetContent onClose={onClose} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}