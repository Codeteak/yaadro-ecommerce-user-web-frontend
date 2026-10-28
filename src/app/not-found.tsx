import type { Metadata } from "next";
import { NotFoundContent } from "@/components/storefront/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Global App Router 404 — same UI as `/playground/not-found`.
 */
export default function NotFound() {
  return <NotFoundContent />;
}
