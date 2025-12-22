import Link from 'next/link';
import Container from '../components/Container';

export default function NotFound() {
  return (
    <div className="py-8 md:py-12 lg:py-16 w-full max-w-full overflow-x-hidden">
      <Container>
        <div className="text-center px-4">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg text-sm md:text-base font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
}

