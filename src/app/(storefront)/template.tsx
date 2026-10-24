import { ViewTransition } from "react";

/**
 * Remounts on each storefront navigation (unlike layout), so enter/exit
 * ViewTransitions run. Bottom nav lives in the layout and stays put.
 * One soft crossfade for tabs, forward, and back.
 */
export default function StorefrontTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "page-crossfade",
        "nav-back": "page-crossfade",
        "nav-tab": "page-crossfade",
        default: "page-crossfade",
      }}
      exit={{
        "nav-forward": "page-crossfade",
        "nav-back": "page-crossfade",
        "nav-tab": "page-crossfade",
        default: "page-crossfade",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
