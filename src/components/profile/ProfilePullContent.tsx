"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, type ReactNode } from "react";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

/**
 * Profile pull-to-refresh — refetches `["profile"]` so hero name/avatar update.
 */
export function ProfilePullContent({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }, [queryClient]);

  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
}
