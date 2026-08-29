'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftRegular as ChevronLeft } from './icons';
import { usePageTitle } from '../context/ShopBrandingContext';

export default function PageTopBar({ title, subtitle, backHref, fallbackHref = '/', right = null }) {
  const router = useRouter();
  usePageTitle(title);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 pt-[env(safe-area-inset-top)]">
        <div
          className={`flex items-center justify-between ${subtitle ? 'py-1.5 sm:py-2' : 'h-12 min-h-[3rem] sm:h-14 sm:min-h-0'}`}
        >
          {backHref ? (
            <Link
              href={backHref}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft size={24} className="w-6 h-6 text-gray-800" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft size={24} className="w-6 h-6 text-gray-800" />
            </button>
          )}

          <div className="flex-1 px-2 sm:px-3 text-center min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-gray-900 truncate">{title}</div>
            {subtitle ? (
              <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>
            ) : null}
          </div>

          <div className="w-10 h-10 flex items-center justify-center">{right}</div>
        </div>
      </div>
    </div>
  );
}

