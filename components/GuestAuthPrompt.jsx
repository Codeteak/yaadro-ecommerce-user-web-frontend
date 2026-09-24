'use client';

import Link from 'next/link';
import PageTopBar from './PageTopBar';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { BRAND_PRIMARY_BTN, PRESSABLE_BTN } from './ui/brandButton';

/**
 * In-page sign-in CTA for protected flows that should not silently dump guests
 * to home (e.g. order history). Back / “Continue shopping” still go home.
 */
export default function GuestAuthPrompt({
  pageTitle,
  description = 'Sign in to access this page.',
  loginReturnPath,
  backHref = '/',
  fallbackHref = '/',
  homeLabel = 'Continue shopping',
}) {
  const { goToLogin } = useLoginNavigation();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBar
          title={pageTitle}
          backHref={backHref}
          fallbackHref={fallbackHref}
        />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
        <p className="text-lg font-semibold text-gray-900">Sign in to continue</p>
        <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>
        <button
          type="button"
          onClick={() => goToLogin(loginReturnPath)}
          className={`mt-6 rounded-full px-8 py-3 text-sm font-semibold ${BRAND_PRIMARY_BTN}`}
        >
          Sign in
        </button>
        <Link
          href={fallbackHref || '/'}
          className={`mt-4 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline ${PRESSABLE_BTN}`}
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
