'use client';

import PageTopBar from './PageTopBar';
import { useAuth } from '../context/AuthContext';

export default function GuestAuthPrompt({
  pageTitle,
  description = 'Sign in to access this page.',
  backHref,
  fallbackHref = '/',
}) {
  const { setShowLoginSheet } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBar title={pageTitle} backHref={backHref} fallbackHref={fallbackHref} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        <p className="text-lg font-semibold text-gray-900">Sign in to continue</p>
        <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>
        <button
          type="button"
          onClick={() => setShowLoginSheet(true)}
          className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
