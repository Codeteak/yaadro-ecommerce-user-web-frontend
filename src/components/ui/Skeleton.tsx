import { cn } from "@/lib/cn";

/**
 * Base pulse bone for loading placeholders.
 * Mint wash matches existing storefront Suspense fallbacks.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-mint/50", className)}
      {...props}
    />
  );
}
