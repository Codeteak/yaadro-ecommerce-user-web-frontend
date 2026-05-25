'use client';

import Image from 'next/image';

/**
 * First-visit splash per browser session: white background, centered shop logo + name.
 * Shows shop image from resolve-by-domain API when available.
 */
export default function ShopSplashScreen({ visible, shopName, shopImage, isLoading }) {
  return (
    <div
      className={`fixed inset-0 z-[500] flex flex-col items-center justify-center bg-white px-8 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
      role="presentation"
    >
      <div className="flex max-w-[280px] flex-col items-center text-center">
        {shopImage ? (
          <div className="relative mb-6 h-28 w-28 overflow-hidden rounded-2xl sm:h-32 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopImage}
              alt={shopName || ''}
              className="h-full w-full rounded-2xl object-contain"
              width={128}
              height={128}
            />
          </div>
        ) : isLoading ? (
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl bg-gray-50 sm:h-32 sm:w-32">
            <div className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-gray-200 border-t-emerald-500" />
          </div>
        ) : (
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl bg-gray-50 sm:h-32 sm:w-32">
            <Image
              src="/trolley.png"
              alt=""
              width={80}
              height={80}
              className="h-16 w-16 object-contain opacity-90 sm:h-20 sm:w-20"
              priority
            />
          </div>
        )}
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[24px]">
          {shopName || 'Yaadro'}
        </h1>
        {isLoading && (
          <div className="mt-6 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
