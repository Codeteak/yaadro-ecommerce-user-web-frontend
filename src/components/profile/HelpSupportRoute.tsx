"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HelpSupportContent } from "@/components/profile/HelpSupportContent";
import { peekNavReturn, popNavReturn } from "@/lib/nav-return-stack";
import type { ShopSupportContact } from "@/lib/sample-shop-support";

/**
 * Live `/profile/support` — reads `?topic=` (#33) and uses the return stack
 * for Back when Help was opened from the price-vary popup.
 */
export function HelpSupportRoute({ contact }: { contact: ShopSupportContact }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topic = searchParams.get("topic");
  const [returnHref, setReturnHref] = useState<string | null>(() =>
    typeof window === "undefined" ? null : peekNavReturn(),
  );

  return (
    <HelpSupportContent
      contact={contact}
      initialTopic={topic}
      backHref={returnHref ?? "/profile"}
      onBackClick={
        returnHref
          ? () => {
              const href = popNavReturn() ?? "/profile";
              setReturnHref(peekNavReturn());
              router.push(href);
            }
          : undefined
      }
    />
  );
}
