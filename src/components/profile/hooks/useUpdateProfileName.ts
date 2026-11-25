"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyProfile, type CustomerProfile } from "@/lib/api/profile";
import { ApiError, firstFieldError } from "@/lib/api/errors";
import { writeCachedProfileUi } from "@/lib/profile-cache";
import { profileNamePatch } from "@/lib/profile-validation";
import { PROFILE_QUERY_KEY } from "@/components/profile/hooks/useMyProfile";

export class ProfileNameUnchangedError extends Error {
  constructor() {
    super("Nothing to save.");
    this.name = "ProfileNameUnchangedError";
  }
}

export function profileSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return firstFieldError(error) ?? error.message;
  if (error instanceof ProfileNameUnchangedError) return error.message;
  return "We couldn't save your name. Check your connection and try again.";
}

/**
 * PATCH only `{ name }` when it changed. Optimistic cache update with rollback.
 */
export function useUpdateProfileName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { currentName: string | null; nextName: string }) => {
      const patch = profileNamePatch(input.currentName, input.nextName);
      if (!patch) throw new ProfileNameUnchangedError();
      return updateMyProfile(patch);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previous = queryClient.getQueryData<CustomerProfile>(PROFILE_QUERY_KEY);
      const patch = profileNamePatch(input.currentName, input.nextName);
      if (previous && patch) {
        queryClient.setQueryData<CustomerProfile>(PROFILE_QUERY_KEY, {
          ...previous,
          user: { ...previous.user, name: patch.name },
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (_data, input) => {
      const profile = queryClient.getQueryData<CustomerProfile>(PROFILE_QUERY_KEY);
      const patch = profileNamePatch(input.currentName, input.nextName);
      const id = profile?.user.id?.trim();
      if (id && patch) {
        writeCachedProfileUi({
          userId: id,
          displayName: patch.name,
          phone: profile?.user.phone,
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
