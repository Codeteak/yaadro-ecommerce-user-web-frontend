import { notFound } from "next/navigation";
import { PlaygroundDemo } from "@/components/playground/demos";
import { PlaygroundBackLink } from "@/components/playground/PlaygroundBackLink";
import { PlaygroundSlugTracker } from "@/components/playground/PlaygroundSlugTracker";
import {
  getPlaygroundEntry,
  PLAYGROUND_ENTRIES,
} from "@/lib/playground/catalog";

export function generateStaticParams() {
  return PLAYGROUND_ENTRIES.map((e) => ({ slug: e.slug }));
}

export default async function PlaygroundEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
