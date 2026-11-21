"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, type ReactNode } from "react";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { cn } from "@/lib/cn";

/**
 * Profile pull-to-refresh — refetches `["profile"]` so hero name/avatar update.
 * Pass `className` when this wrapper is the page scrollport (short phones).
 */
export function ProfilePullContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }, [queryClient]);

  return (
    <PullToRefresh onRefresh={onRefresh} className={cn(className)}>
      {children}
    </PullToRefresh>
  );
}
