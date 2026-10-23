type PlannedStubProps = {
  title: string;
  description: string;
  wiresTo?: string;
};

/** Placeholder for components we will build here before wiring into ecom. */
export function PlannedStub({ title, description, wiresTo }: PlannedStubProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-leaf uppercase">
        Planned
      </p>
      <h2 className="mt-2 text-xl font-extrabold text-ink">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {wiresTo ? (
        <p className="mt-4 rounded-full bg-mint/70 px-3 py-1 text-xs font-semibold text-forest">
          Will wire to: {wiresTo}
        </p>
      ) : null}
      <p className="mt-6 max-w-xs text-xs leading-5 text-muted">
        Implement the UI in this playground first, then import the same
        component into the storefront route.
      </p>
    </div>
  );
}
