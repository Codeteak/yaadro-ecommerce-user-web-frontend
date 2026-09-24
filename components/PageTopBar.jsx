'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftRegular as ChevronLeft } from './icons';
import { usePageTitle } from '../context/ShopBrandingContext';
import IconBackButton from './ui/IconBackButton';

export default function PageTopBar({ title, subtitle, backHref, fallbackHref = '/', right = null }) {
  const router = useRouter();
  usePageTitle(title);

  const handleBack = () => {
    if (backHref) {
      router.replace(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  return (
    <div className="w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-3 pt-[env(safe-area-inset-top)] sm:px-4">
        <div
          className={`flex items-center justify-between ${subtitle ? 'py-1.5 sm:py-2' : 'h-12 min-h-[3rem] sm:h-14 sm:min-h-0'}`}
        >
          <IconBackButton onClick={handleBack} className="hover:bg-gray-100">
            <ChevronLeft size={24} className="h-6 w-6 text-gray-800" aria-hidden />
          </IconBackButton>

          <div className="min-w-0 flex-1 px-2 text-center sm:px-3">
            <div className="truncate text-sm font-extrabold text-gray-900 sm:text-base">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 truncate text-[11px] text-gray-500 sm:text-xs">
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="flex h-10 w-10 items-center justify-center">{right}</div>
        </div>
      </div>
    </div>
  );
}
