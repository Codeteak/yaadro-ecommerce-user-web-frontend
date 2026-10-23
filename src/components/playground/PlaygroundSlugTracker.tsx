"use client";

import { useEffect } from "react";
import { setPlaygroundLastSlug } from "@/lib/playground/session";

/** Stamps the current demo slug so catalog restore can scroll to it. */
export function PlaygroundSlugTracker({ slug }: { slug: string }) {
  useEffect(() => {
    setPlaygroundLastSlug(slug);
  }, [slug]);

  return null;
}
