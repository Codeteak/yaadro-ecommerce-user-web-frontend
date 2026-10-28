import { StorefrontPageSkeleton } from "@/components/ui/skeletons";

/**
 * Light shell while the next storefront segment loads.
 * Kept minimal so view transitions stay the main motion cue.
 */
export default function StorefrontLoading() {
  return <StorefrontPageSkeleton />;
}
