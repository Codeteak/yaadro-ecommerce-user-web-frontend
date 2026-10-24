import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlaygroundDemo } from "@/components/playground/demos";
import { PlaygroundBackLink } from "@/components/playground/PlaygroundBackLink";
import { PlaygroundSlugTracker } from "@/components/playground/PlaygroundSlugTracker";
import {
  getPlaygroundEntry,
  PLAYGROUND_ENTRIES,
} from "@/lib/playground/catalog";

type PlaygroundEntryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PLAYGROUND_ENTRIES.map((e) => ({ slug: e.slug }));
}

function PlaygroundEntryFallback() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy aria-label="Loading demo">
      <div className="h-4 w-24 animate-pulse rounded bg-mint/50" />
      <div className="mt-3 h-8 w-48 animate-pulse rounded-lg bg-mint/60" />
      <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-mint/40" />
      <div className="mt-8 h-64 w-full animate-pulse rounded-2xl bg-mint/30" />
    </div>
  );
}

async function PlaygroundEntryContent({ params }: PlaygroundEntryPageProps) {
  const { slug } = await params;
  const entry = getPlaygroundEntry(slug);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PlaygroundSlugTracker slug={entry.slug} />
      <PlaygroundBackLink />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight text-forest sm:text-2xl">
          {entry.title}
        </h1>
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
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        {entry.description}
      </p>
      {entry.wiresTo ? (
        <p className="mt-1 text-[13px] font-semibold text-leaf">
          Wires to: {entry.wiresTo}
        </p>
      ) : null}

      <div className="mt-8">
        <PlaygroundDemo slug={entry.slug} />
      </div>
    </div>
  );
}

/**
 * `params` resolve behind Suspense so the Instant shell stays valid
 * (same pattern as storefront product/[id]).
 */
export default function PlaygroundEntryPage({
  params,
}: PlaygroundEntryPageProps) {
  return (
    <Suspense fallback={<PlaygroundEntryFallback />}>
      <PlaygroundEntryContent params={params} />
    </Suspense>
  );
}
