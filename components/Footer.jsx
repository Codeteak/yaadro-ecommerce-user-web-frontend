'use client';

import Image from 'next/image';
import Container from './Container';

/**
 * Site brand footer. When `fixed`, pinned above the mobile bottom nav
 * (or the viewport bottom when the nav is hidden).
 */
export default function Footer({ fixed = false, bottomOffset = 0, footerRef = null }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className={
        fixed
          ? 'pointer-events-none fixed inset-x-0 z-40 w-full max-w-full overflow-x-hidden border-t border-gray-100 bg-white'
          : 'relative mt-auto w-full max-w-full overflow-x-hidden border-t border-gray-100 bg-white'
      }
      style={
        fixed
          ? {
              bottom: bottomOffset,
            }
          : undefined
      }
    >
      <Container>
        <div
          className={`pointer-events-auto px-3 sm:px-4 md:px-0 ${
            fixed
              ? 'py-3 sm:py-4'
              : 'pt-8 pb-6 sm:pt-10 sm:pb-8 md:pt-16 md:pb-12 [@media(max-height:720px)]:pt-6 [@media(max-height:720px)]:pb-5'
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <h2
              className={`font-headingnow font-extrabold text-gray-300/90 select-none ${
                fixed ? 'text-[1.5rem] leading-none sm:text-[1.75rem]' : 'text-footer-brand-wordmark'
              }`}
              aria-label="Yaadro"
            >
              Yaadro
            </h2>
            <p
              className={`font-extrabold tracking-[0.35em] text-violet-400 sm:tracking-[0.4em] ${
                fixed ? 'mt-1 text-sm sm:text-base' : 'mt-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl'
              }`}
            >
              SHOP
            </p>
          </div>

          <div className={`mx-auto h-px max-w-md bg-gray-100 ${fixed ? 'mt-3 mb-2.5' : 'mt-8 mb-6'}`} />

          <a
            href="https://codeteak.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
            aria-label="Maintained by codeteak.com"
          >
            <span>Maintained by</span>
            <Image
              src="/codeteak-logo.png"
              alt="Codeteak"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
            <span className="font-semibold text-gray-700">codeteak.com</span>
          </a>

          <p className={`text-center text-[11px] text-gray-400 ${fixed ? 'mt-1.5' : 'mt-3'}`}>
            &copy; {currentYear} Yaadro. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
