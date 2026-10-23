export function VerifiedSuccess() {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="verified-pop flex h-24 w-24 items-center justify-center rounded-full bg-leaf shadow-[0_12px_40px_rgba(92,184,92,0.35)]">
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
      </div>
      <h2 className="verified-fade-in mt-6 text-2xl font-bold tracking-tight text-forest">
        Verified
      </h2>
      <p className="verified-fade-in mt-2 text-[15px] text-muted">
        Taking you to the storefront…
      </p>
    </div>
  );
}
