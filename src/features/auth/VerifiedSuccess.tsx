export type VerifiedSuccessStatus = "confirming" | "success";

export type VerifiedSuccessProps = {
  /** Representative supermarket / shop brand (from SEO / ShopNameProvider). */
  shopName?: string;
  /**
   * `confirming` — spinner, no check (OTP still in flight).
   * `success` — check + welcome (default).
   */
  status?: VerifiedSuccessStatus;
  /** Override headline. */
  title?: string;
  /** Supporting line under the headline. */
  subtitle?: string;
};

export function VerifiedSuccess({
  shopName = "Yaadro",
  status = "success",
  title,
  subtitle,
}: VerifiedSuccessProps) {
  const confirming = status === "confirming";
  const headline =
    title ?? (confirming ? "Confirming" : `Welcome to ${shopName}`);
  const line =
    subtitle ??
    (confirming
      ? "Confirming your code…"
      : "You're signed in. Taking you home…");

  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      role="status"
      aria-live="polite"
      aria-busy={confirming || undefined}
    >
      <div
        className={
          confirming
            ? "flex h-24 w-24 items-center justify-center rounded-full bg-mint ring-1 ring-leaf/25"
            : "verified-pop flex h-24 w-24 items-center justify-center rounded-full bg-leaf shadow-[0_12px_40px_rgba(92,184,92,0.35)]"
        }
      >
        {confirming ? (
          <span
            className="ptr-spin size-10 rounded-full border-[3px] border-leaf/25 border-t-leaf"
            aria-hidden
          />
        ) : (
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              className="verified-check-draw"
              d="M5 12.5 10 17.5 19 7.5"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <h2
        className={
          confirming
            ? "mt-6 text-2xl font-bold tracking-tight text-forest"
            : "verified-fade-in mt-6 text-2xl font-bold tracking-tight text-forest"
        }
      >
        {headline}
      </h2>
      <p
        className={
          confirming
            ? "mt-2 max-w-xs text-[15px] text-muted"
            : "verified-fade-in mt-2 max-w-xs text-[15px] text-muted"
        }
      >
        {line}
      </p>
    </div>
  );
}
