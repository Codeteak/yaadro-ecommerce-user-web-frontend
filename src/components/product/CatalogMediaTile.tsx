import { cn } from "@/lib/cn";

const TILE = [
  "bg-[#e8f5e8] text-forest",
  "bg-[#fff3d6] text-amber-950",
  "bg-[#e8eef8] text-forest",
  "bg-[#fce8e8] text-red-900",
] as const;

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function accentIndex(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % TILE.length;
}

/**
 * Zero-byte product photo stand-in for Save-Data / 2g / offline cold.
 * Phase 4 adaptive media.
 */
export function CatalogMediaTile({
  name,
  seed,
  className,
}: {
  name: string;
  /** Stable id for accent color. */
  seed: string;
  className?: string;
}) {
  const initials = initialsFor(name) || "·";
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-full w-full items-center justify-center font-black tracking-tight",
        TILE[accentIndex(seed)],
        className,
      )}
    >
      <span className="text-[clamp(1.1rem,4.5vw,1.5rem)]">{initials}</span>
    </div>
  );
}
