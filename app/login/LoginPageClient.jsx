'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import LoginPanel from '../../components/LoginPanel';
import {
  clearPostLoginRedirect,
  getPostLoginRedirect,
  sanitizeInternalPath,
  setPostLoginRedirect,
} from '../../utils/authSession';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, authHydrated } = useAuth();

  useEffect(() => {
    const next = sanitizeInternalPath(searchParams.get('next'));
    if (next) setPostLoginRedirect(next);
  }, [searchParams]);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated) return;
    const dest = getPostLoginRedirect() || '/';
    clearPostLoginRedirect();
    router.replace(dest);
  }, [authHydrated, isAuthenticated, router]);

  return (
    <div className="flex min-h-[100dvh] min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-white pt-[env(safe-area-inset-top,0px)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-gray-100"
          aria-label="Go back"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold text-gray-900">Sign in</h1>
          <p className="text-[12px] text-gray-500">Mobile OTP</p>
        </div>
        <Link
          href="/"
          className="whitespace-nowrap text-[13px] font-semibold text-violet-700 hover:text-violet-800"
        >
          Home
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto w-full max-w-[420px]">
          <LoginPanel />
        </div>
      </main>
    </div>
  );
}
