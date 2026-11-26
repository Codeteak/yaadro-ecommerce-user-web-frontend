import { cn } from "@/lib/cn";

/** Logout sketch asset (`/icons/logout-sketch.png`) tinted via CSS mask. */
export function LogoutSketchIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-red-600", className)}
      style={{
        WebkitMaskImage: "url(/icons/logout-sketch.png)",
        maskImage: "url(/icons/logout-sketch.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
