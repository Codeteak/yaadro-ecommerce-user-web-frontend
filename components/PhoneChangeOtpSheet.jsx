'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import IndianPhoneInput from './IndianPhoneInput';
import {
  requestPhoneChangeOtp,
  verifyPhoneChangeOtp,
  normalizePhoneForApi,
  normalizeCustomerFromMeProfile,
} from '../utils/authApi';
import { persistAccessToken } from '../utils/apiClient';
import { normalizeOtpCodeInput } from '../utils/otpVerifyPayload';
import { getIndianPhoneSubmitError, isValidIndianMobile } from '../utils/indianPhone';
import { otpSchema, firstZodIssueMessage } from '../lib/validations/auth.schema';

const RESEND_WAIT_SEC = 60;

/**
 * Change the account login phone via storefront OTP.
 * On verify, replaces stored JWT/refresh and refreshes the user.
 */
export default function PhoneChangeOtpSheet({
  isOpen,
  onClose,
  onSuccess,
  currentPhone = '',
  title = 'Change phone number',
  description = 'We will send an OTP to the new number. Your session will be refreshed after verification.',
}) {
  const { login, refreshUser, user } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setPhone('');
      setCode('');
      setError('');
      setPending(false);
      setResendSecondsLeft(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return undefined;
    const id = window.setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [resendSecondsLeft]);

  if (!isOpen) return null;

  const current = normalizePhoneForApi(currentPhone || user?.phone || '');

  const handleRequest = async (e) => {
    e?.preventDefault();
    setError('');
    const nextPhone = normalizePhoneForApi(phone);
    const phoneErr = getIndianPhoneSubmitError(phone);
    if (!isValidIndianMobile(nextPhone) || phoneErr) {
      setError(phoneErr || 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (current && nextPhone === current) {
      setError('Enter a different number from your current phone.');
      return;
    }
    setPending(true);
    try {
      await requestPhoneChangeOtp(nextPhone);
      setStep('otp');
      setResendSecondsLeft(RESEND_WAIT_SEC);
    } catch (err) {
      setError(err?.message || 'Could not send OTP. Please wait and try again.');
    } finally {
      setPending(false);
    }
  };

  const applyNewSession = async (tokens, nextPhone) => {
    if (tokens?.token) persistAccessToken(tokens.token);
    const mergedUser = {
      ...(user && typeof user === 'object' ? user : {}),
      phone: nextPhone,
    };
    login(
      mergedUser,
      {
        token: tokens?.token,
        refreshToken: tokens?.refreshToken,
      },
      { skipPostLoginRedirect: true }
    );
    await refreshUser({ silent: true });
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');
    const nextPhone = normalizePhoneForApi(phone);
    const nextCode = normalizeOtpCodeInput(code);
    const otpErr = firstZodIssueMessage(otpSchema.safeParse(nextCode));
    if (otpErr) {
      setError(otpErr);
      return;
    }
    setPending(true);
    try {
      const session = await verifyPhoneChangeOtp({ newPhone: nextPhone, code: nextCode });
      if (!session.token) throw new Error('Phone updated but no session was returned. Please sign in again.');
      const fromProfile = Array.isArray(session.raw?.profile)
        ? null
        : normalizeCustomerFromMeProfile(session.raw?.profile);
      if (fromProfile) {
        login(
          { ...fromProfile, phone: fromProfile.phone || nextPhone },
          { token: session.token, refreshToken: session.refreshToken },
          { skipPostLoginRedirect: true }
        );
      } else {
        await applyNewSession(session, nextPhone);
      }
      onSuccess?.(nextPhone);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {step === 'phone' ? (
          <form onSubmit={handleRequest} className="mt-4">
            <IndianPhoneInput
              value={phone}
              onChange={setPhone}
              inputClassName="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              showValidHint={false}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-4">
            <p className="mb-2 text-xs text-gray-500">
              Code sent to +91 {normalizePhoneForApi(phone)}
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(normalizeOtpCodeInput(e.target.value).slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              className="h-12 w-full rounded-xl border border-gray-200 px-3 text-center text-lg font-semibold tracking-[0.3em] text-gray-900"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
                className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
              >
                Change number
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            <button
              type="button"
              disabled={pending || resendSecondsLeft > 0}
              onClick={handleRequest}
              className="mt-3 w-full text-center text-xs font-semibold text-violet-700 disabled:text-gray-400"
            >
              {resendSecondsLeft > 0 ? `Resend OTP in ${resendSecondsLeft}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
