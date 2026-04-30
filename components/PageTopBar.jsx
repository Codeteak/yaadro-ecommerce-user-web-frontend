'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ExportLink from './ExportLink';
import { toExportedHref } from '../utils/toExportedHref';

export default function PageTopBar({ title, subtitle, backHref, fallbackHref = '/', right = null }) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(toExportedHref(backHref));
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(toExportedHref(fallbackHref));
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-4 pt-[env(safe-area-inset-top)]">
        <div className={`flex items-center justify-between ${subtitle ? 'py-2' : 'h-14'}`}>
          {backHref ? (
            <ExportLink
              href={backHref}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </ExportLink>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
          )}

          <div className="flex-1 px-3 text-center min-w-0">
            <div className="text-base font-extrabold text-gray-900 truncate">{title}</div>
            {subtitle ? (
              <div className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>
            ) : null}
          </div>

          <div className="w-10 h-10 flex items-center justify-center">{right}</div>
        </div>
      </div>
    </div>
  );
}

