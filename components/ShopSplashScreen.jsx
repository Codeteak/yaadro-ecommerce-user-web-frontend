'use client';

import Image from 'next/image';

/**
 * First-visit splash per browser session: white background, centered shop logo + name.
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
          <div className="relative mb-5 h-24 w-24 sm:h-28 sm:w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shopImage}
              alt=""
              className="h-full w-full object-contain"
              width={112}
              height={112}
            />
          </div>
        ) : (
          <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-50 sm:h-28 sm:w-28">
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
        <h1 className="text-[20px] font-semibold tracking-tight text-gray-900 sm:text-[22px]">
          {shopName || 'Yaadro'}
        </h1>
        {isLoading ? (
          <div className="mt-5 h-1 w-24 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500/80" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
