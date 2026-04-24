'use client';

import Container from './Container';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white mt-auto w-full max-w-full overflow-x-hidden border-t border-gray-200">
      <Container>
        <div className="py-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 min-w-0">
            <span
              className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold"
              aria-label="Yaadro"
              title="Yaadro"
            >
              Y
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">Yaadro</span>
          </Link>
          <p className="text-xs text-gray-500 whitespace-nowrap">© {currentYear}</p>
        </div>
      </Container>
    </footer>
  );
}
