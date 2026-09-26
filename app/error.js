'use client';

/**
 * Route-level recovery UI — replaces Next’s blank “Application error” screen.
 */
export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        This page hit an unexpected error. You can try again or go back to shopping.
      </p>
      {process.env.NODE_ENV !== 'production' && error?.message ? (
        <p className="mt-3 max-w-md break-words text-left text-xs text-red-600/90">
          {String(error.message)}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-[#902bf5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7d24d6]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Home
        </a>
      </div>
    </div>
  );
}
