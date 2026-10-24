/**
 * Light shell while the next storefront segment loads.
 * Kept minimal so view transitions stay the main motion cue.
 */
export default function StorefrontLoading() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 bg-paper px-5 pt-16"
      aria-busy
      aria-label="Loading"
    >
      <div className="h-8 w-40 animate-pulse rounded-full bg-mint/70" />
      <div className="h-36 animate-pulse rounded-[1.75rem] bg-mint/50" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-44 animate-pulse rounded-2xl bg-mint/40" />
        <div className="h-44 animate-pulse rounded-2xl bg-mint/40" />
      </div>
    </div>
  );
}
