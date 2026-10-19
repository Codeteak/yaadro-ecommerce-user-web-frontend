"use client";

import { usePathname } from "next/navigation";
import { SwipeToLogin } from "./SwipeToLogin";

/** Remounts the swipe control whenever `/` is entered so Back never leaves it stuck. */
export function OnboardingSwipe() {
  const pathname = usePathname();
  return <SwipeToLogin key={pathname} href="/login" />;
}
