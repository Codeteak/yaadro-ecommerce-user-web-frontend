"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCustomerAuthStatus } from "@/components/auth/useCustomerSignedIn";
import { getMyProfile, type CustomerProfile } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/errors";
import {
  getCachedProfileUiServerSnapshot,
  readCachedProfileUi,
  subscribeCachedProfileUi,
  writeCachedProfileUi,
} from "@/lib/profile-cache";
import { useOnlineStatus } from "@/lib/use-online-status";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export type ProfileStatus =
  | "auth-loading"
  | "guest"
  | "loading"
  | "ready"
  | "error"
  | "offline";

/** Playground / tests: skip the session and API entirely. */
export type ProfilePreview = {
  signedIn: boolean;
  profile?: CustomerProfile | null;
  status?: Extract<ProfileStatus, "error" | "offline" | "loading">;
};

export type MyProfileState = {
  status: ProfileStatus;
  signedIn: boolean;
  profile: CustomerProfile | null;
  /** Full name (legacy nickname only as a read fallback). */
  displayName: string | null;
  phone: string | null;
  userId: string | null;
  online: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

export function profileFullName(profile: CustomerProfile | null): string | null {
  if (!profile) return null;
  return (
    profile.user.name?.trim() ||
    profile.customer.displayName?.trim() ||
    null
  );
}

/**
 * One source for the signed-in profile: session gate, `["profile"]` query,
 * name cache for instant paint, and online / error status.
 */
export function useMyProfile(preview?: ProfilePreview): MyProfileState {
  const authStatus = useCustomerAuthStatus();
  const online = useOnlineStatus();
  const cached = useSyncExternalStore(
    subscribeCachedProfileUi,
    readCachedProfileUi,
    getCachedProfileUiServerSnapshot,
  );
  const signedIn = preview
    ? preview.signedIn
    : authStatus === "signed-in";

  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => getMyProfile(signal),
    enabled: !preview && signedIn,
    staleTime: 60_000,
    retry: (count, error) =>
      count < 2 && !(error instanceof ApiError && error.status < 500),
  });

  useEffect(() => {
    if (preview || !query.data) return;
    const name = profileFullName(query.data);
    const id = query.data.user.id?.trim();
    if (name && id) writeCachedProfileUi({ userId: id, displayName: name });
  }, [preview, query.data]);

  if (preview) {
    const profile = preview.profile ?? null;
    return {
      status: !preview.signedIn
        ? "guest"
        : (preview.status ?? (profile ? "ready" : "loading")),
      signedIn: preview.signedIn,
      profile,
      displayName: profileFullName(profile),
      phone: profile?.user.phone ?? null,
      userId: profile?.user.id ?? null,
      online: preview.status !== "offline",
      errorMessage:
        preview.status === "error" ? "We couldn't load your profile." : null,
      refetch: () => undefined,
    };
  }

  const profile = query.data ?? null;
  const displayName = profileFullName(profile) ?? cached?.displayName ?? null;
  let status: ProfileStatus;
  if (authStatus === "loading") status = "auth-loading";
  else if (!signedIn) status = "guest";
  else if (profile) status = "ready";
  else if (!online) status = "offline";
  else if (query.isError) status = "error";
  else status = "loading";

  return {
    status,
    signedIn,
    profile,
    displayName,
    phone: profile?.user.phone ?? null,
    userId: profile?.user.id ?? cached?.userId ?? null,
    online,
    errorMessage: query.isError
      ? query.error instanceof ApiError
        ? query.error.message
        : "We couldn't load your profile. Check your connection and try again."
      : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
