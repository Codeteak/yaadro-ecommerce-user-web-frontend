'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useShopBranding } from '../../context/ShopBrandingContext';
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
  const { shopName, shopImage, isResolving } = useShopBranding();

  const displayName = shopName || 'Yaadro';

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
      <header className="flex shrink-0 flex-col items-center px-4 pb-2 pt-4 sm:pt-5">
        <Link
          href="/"
          className="flex flex-col items-center text-center transition-opacity hover:opacity-90 active:opacity-80"
          aria-label={`${displayName} home`}
        >
          {shopImage ? (
            <div className="relative mb-2.5 h-16 w-16 sm:h-[72px] sm:w-[72px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopImage}
                alt=""
                className="h-full w-full object-contain"
                width={72}
                height={72}
              />
            </div>
          ) : (
            <div className="mb-2.5 flex h-16 w-16 items-center justify-center sm:h-[72px] sm:w-[72px]">
              {isResolving ? (
                <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-100" />
              ) : (
                <Image
                  src="/trolley.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain opacity-90"
                  priority
                />
              )}
            </div>
          )}
          <h1 className="text-[18px] font-bold tracking-tight text-gray-900 sm:text-[20px]">
            {isResolving && !shopName ? (
              <span className="inline-block h-5 w-28 animate-pulse rounded bg-gray-100" />
            ) : (
              displayName
            )}
          </h1>
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto w-full max-w-[420px]">
          <LoginPanel />
        </div>
      </main>
    </div>
  );
}
