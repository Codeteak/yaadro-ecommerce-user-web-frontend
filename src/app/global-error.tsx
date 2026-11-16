"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-sm">
          Please try again{error.digest ? `. Reference ${error.digest}` : ""}.
        </p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-black px-6 py-3 text-white">
          Try again
        </button>
      </body>
    </html>
  );
}
