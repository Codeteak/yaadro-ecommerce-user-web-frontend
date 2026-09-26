'use client';

/**
 * Root recovery when the app tree crashes (layout/providers).
 * Must include its own html/body — replaces the root layout.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">
            The storefront failed to load. Try again — if it keeps happening, clear site data
            for this shop and reload.
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
              className="rounded-full bg-[#902bf5] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-800"
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
