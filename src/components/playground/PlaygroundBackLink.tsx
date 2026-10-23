"use client";

import { useRouter } from "next/navigation";

/**
 * Returns to the catalog index. Scroll / last-slug restore on the index
 * keeps you near the component you left (not stuck at the top).
 */
export function PlaygroundBackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/playground")}
      className="cursor-pointer text-[13px] font-semibold text-leaf transition hover:text-leaf-bright"
    >
      ← Catalog
    </button>
  );
}
