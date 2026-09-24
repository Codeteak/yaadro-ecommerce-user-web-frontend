'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import LoginPanel from '../../components/LoginPanel';
import { ArrowLeftRegular as ArrowLeft } from '../../components/icons';
import { PRESSABLE_ICON_BTN_SOFT, PRESSABLE_BTN } from '../../components/ui/brandButton';
import {
  sanitizeInternalPath,
  setPostLoginRedirect,
  takePostLoginRedirect,
} from '../../utils/authSession';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, authHydrated } = useAuth();
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    const next = sanitizeInternalPath(searchParams.get('next'));
    if (next) setPostLoginRedirect(next);
  }, [searchParams]);

  useEffect(() => {
    if (!authHydrated || !isAuthenticated) return;
    const dest = takePostLoginRedirect() || '/';
    setIsContinuing(true);
    router.replace(dest);
  }, [authHydrated, isAuthenticated, router]);

  return (
    <div className="relative flex min-h-[100dvh] min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_42%,#ffffff_100%)] pt-[env(safe-area-inset-top,0px)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_at_50%_18%,rgba(144,43,245,0.12)_0%,rgba(144,43,245,0.04)_42%,transparent_70%)]"
        aria-hidden
      />

      <header className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => router.back()}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200/80 bg-white/80 text-gray-700 shadow-[0_2px_10px_rgba(16,24,40,0.04)] backdrop-blur-sm hover:bg-white ${PRESSABLE_ICON_BTN_SOFT}`}
          aria-label="Go back"
        >
          <ArrowLeft size={18} className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold text-gray-900">Sign in</h1>
          <p className="mt-0.5 inline-flex items-center rounded-full bg-[#902bf5]/10 px-2 py-0.5 text-[11px] font-semibold text-[#902bf5]">
            Mobile OTP
          </p>
        </div>
        <Link
          href="/"
          className={`whitespace-nowrap text-[13px] font-semibold text-[#902bf5] hover:text-[#7d24d6] ${PRESSABLE_BTN}`}
        >
          Home
        </Link>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          {isContinuing ? (
            <p className="text-center text-[14px] text-gray-600" role="status">
              Continuing…
            </p>
          ) : (
            <LoginPanel />
          )}
        </div>

        <p
          className="pointer-events-none mt-8 select-none text-center font-headingnow text-[1.75rem] font-extrabold tracking-[0.06em] text-[#902bf5]/25 sm:mt-10 sm:text-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          aria-hidden
        >
          Yaadro
        </p>
      </main>
    </div>
  );
}
