import {
  PLAYGROUND_ENTRIES,
  playgroundGroups,
} from "@/lib/playground/catalog";
import { CatalogCardLink } from "@/components/playground/CatalogCardLink";
import { PlaygroundCatalogRestore } from "@/components/playground/PlaygroundCatalogRestore";

export default function PlaygroundIndexPage() {
  const built = PLAYGROUND_ENTRIES.filter((e) => e.status === "built").length;
  const planned = PLAYGROUND_ENTRIES.filter((e) => e.status === "planned").length;
  const groups = playgroundGroups();

  return (
    <PlaygroundCatalogRestore>
      <div className="mx-auto max-w-3xl">
        <p className="text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
          Yaadro storefront
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-forest sm:text-3xl">
          Component playground
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted">
          Build and review UI here, then wire the same components into the live
          ecom routes. Each demo includes{" "}
          <span className="font-semibold text-ink">Source</span> (full file) and{" "}
          <span className="font-semibold text-ink">Usage</span> with Copy for
          handoff. This area is{" "}
          <span className="font-semibold text-ink">dev-only</span> — middleware
          returns 404 in production.
        </p>
        <p className="mt-2 text-sm text-muted">
          {built} built · {planned} planned — full list is always in the left nav
        </p>

        <div className="mt-8 space-y-8">
          {groups.map(([group, entries]) => (
            <section key={group}>
              <h2 className="text-sm font-bold tracking-wide text-forest uppercase">
                {group}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {entries.map((entry) => (
                  <li key={entry.slug}>
                    <CatalogCardLink
                      slug={entry.slug}
                      className="block rounded-2xl bg-paper px-4 py-3 shadow-[0_6px_18px_rgba(47,107,47,0.06)] ring-1 ring-forest/8 transition hover:ring-leaf/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-ink">{entry.title}</span>
                        <span
                          className={
                            entry.status === "built"
                              ? "rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-forest uppercase"
                              : "rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-muted uppercase"
                          }
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-muted">
                        {entry.description}
                      </p>
                      {entry.wiresTo ? (
                        <p className="mt-2 text-[11px] font-semibold text-leaf">
                          → {entry.wiresTo}
                        </p>
                      ) : null}
                    </CatalogCardLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </PlaygroundCatalogRestore>
  );
}
