"use client";

import { useEffect } from "react";
import { logger } from "@/lib/api/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("ui.crash", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="text-2xl font-extrabold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Please try again. If it keeps happening, tell support
        {error.digest ? ` and mention ${error.digest}` : ""}.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-track px-7 text-base font-bold text-black"
      >
        Try again
      </button>
    </main>
  );
}
