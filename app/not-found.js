import Link from 'next/link';
import Container from '../components/Container';

export default function NotFound() {
  return (
    <div className="py-6 sm:py-8 md:py-12 lg:py-16 w-full max-w-full overflow-x-hidden [@media(max-height:720px)]:py-5">
      <Container>
        <div className="text-center px-3 sm:px-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-600">404</p>
          <h1 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Page not found
          </h1>
          <p className="mx-auto mb-8 max-w-md text-base text-gray-600 md:text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[#902bf5] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(144,43,245,0.35)] transition hover:bg-[#7d24d6] md:px-8 md:py-3 md:text-base"
          >
            Back to home
          </Link>
        </div>
      </Container>
    </div>
  );
}
