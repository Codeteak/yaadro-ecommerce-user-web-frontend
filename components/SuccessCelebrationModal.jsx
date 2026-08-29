'use client';

import { useEffect } from 'react';
import { CheckRegular as Check } from './icons';

/**
 * Full-screen success overlay — used after address save/update instead of a generic alert.
 */
export default function SuccessCelebrationModal({
  open,
  title = 'Success',
  message = '',
  actionLabel = 'Continue',
  onContinue,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 px-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-celebration-title"
    >
      <div className="w-full max-w-[320px] animate-[fadeIn_0.25s_ease-out] rounded-3xl bg-white p-6 shadow-2xl shadow-violet-900/10">
        <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Check size={32} className="h-8 w-8 text-white" aria-hidden />
          </div>
        </div>
        <h2
          id="success-celebration-title"
          className="text-center text-[18px] font-semibold tracking-tight text-gray-900"
        >
          {title}
        </h2>
        {message ? (
          <p className="mt-2 text-center text-[13px] leading-relaxed text-gray-500">{message}</p>
        ) : null}
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-full bg-violet-600 py-3 text-[14px] font-medium text-white transition hover:bg-violet-700 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
