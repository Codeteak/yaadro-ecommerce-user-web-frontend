'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/apiClient';

export default function LoginBottomSheet({ isOpen, onClose }) {
  const emailInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setEmail('');
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isSubmitted) return;

    const t = setTimeout(() => {
      emailInputRef.current?.focus?.();
    }, 80);

    return () => clearTimeout(t);
  }, [isOpen, isSubmitted]);

  const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value.trim());

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setServerMessage('');

    const nextEmail = email.trim();
    if (!isValidEmail(nextEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/auth/magic-link', {
        method: 'POST',
        body: { email: nextEmail },
        returnResponse: true,
      });
      setServerMessage(
        res?.message ||
          'Verification link sent to your email. Please open it to login.'
      );
      setIsSubmitted(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setIsSubmitted(false);
    setError('');
    setServerMessage('');
    setTimeout(() => emailInputRef.current?.focus?.(), 80);
  };

  // Render content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!isSubmitted ? (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          {/* Welcome */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/gif/welcome.gif"
              alt="Welcome"
              className="w-44 h-44 object-contain"
            />
            <p className="mt-2 text-sm text-gray-600 max-w-sm">
              “Welcome back — sign in to continue shopping fresh, fast, and hassle‑free.”
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="you@example.com"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all bg-white"
              required
              autoComplete="email"
            />
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              We’ll email you a verification link.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Sending…' : 'Send verification email'}
          </button>
        </form>
      ) : (
        <div className="py-2 flex flex-col items-center justify-center text-center">
          <img
            src="/gif/mail.gif"
            alt="Check your email"
            className="w-56 h-56 object-contain"
          />
          <h3 className="mt-2 text-xl font-bold text-gray-900">Check your email</h3>
          <p className="mt-2 text-sm text-gray-600">
            {serverMessage || 'Please check your mail to verify email.'}
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 break-all">{email.trim()}</p>

          <div className="mt-6 w-full space-y-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-black transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUseDifferentEmail}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-[70] md:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{ transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />

      {/* Desktop Modal Container */}
      <div
        className={`hidden md:flex md:fixed md:inset-0 md:items-center md:justify-center z-[71] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Desktop: Centered Modal */}
        <div
          className={`hidden md:block bg-white rounded-2xl shadow-2xl z-[70] transform relative ${
            isOpen
              ? 'scale-100 opacity-100'
              : 'scale-95 opacity-0 pointer-events-none'
          }`}
          style={{
            maxHeight: '90vh',
            width: '100%',
            maxWidth: '28rem',
            transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: isOpen ? 'transform, opacity' : 'auto'
          }}
        >
          {/* Handle Bar - Mobile only */}
          <div className="hidden md:block"></div>

          {/* Header - Desktop */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isSubmitted ? 'Verify your email' : 'Sign in'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isSubmitted ? 'We sent a verification link to your inbox.' : 'Enter your email to continue.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - Desktop */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {renderFormContent()}
          </div>
        </div>
      </div>

      {/* Mobile: Bottom Sheet - Fixed at bottom */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-b from-white to-gray-50 rounded-t-3xl shadow-2xl z-[70] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          maxHeight: '90vh',
          width: '100%',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isOpen ? 'transform, opacity' : 'auto'
        }}
      >
        {/* Handle Bar - Mobile only */}
        <div className="flex justify-center pt-4 pb-3 md:hidden">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header - Mobile */}
        <div className="px-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isSubmitted ? 'Verify your email' : 'Sign in'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isSubmitted ? 'We sent a verification link to your inbox.' : 'Enter your email to continue.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Mobile */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {renderFormContent()}
        </div>
      </div>
    </>
  );
}

