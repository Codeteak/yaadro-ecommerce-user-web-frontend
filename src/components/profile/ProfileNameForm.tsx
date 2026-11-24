"use client";

import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FULL_NAME_MAX,
  profileNameFormSchema,
} from "@/lib/profile-validation";
import {
  profileSaveErrorMessage,
  useUpdateProfileName,
} from "@/components/profile/hooks/useUpdateProfileName";
import { showPopup } from "@/components/ui/Toast";
import {
  fieldError,
  primaryButton,
  secondaryButton,
  textInput,
} from "@/components/profile/profile-styles";

type ProfileNameFormProps = {
  currentName: string | null;
  online: boolean;
  onDone: () => void;
  /** Prefer over onDone when Cancel should ask about unsaved edits. */
  onCancel?: () => void;
  /** Playground: validate only, never PATCH. */
  dryRun?: boolean;
};

/** Inline full-name edit inside the identity card. */
export function ProfileNameForm({
  currentName,
  online,
  onDone,
  onCancel,
  dryRun = false,
}: ProfileNameFormProps) {
  const inputId = useId();
  const errorId = useId();
  const schema = useMemo(() => profileNameFormSchema(currentName), [currentName]);
  const mutation = useUpdateProfileName();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: currentName ?? "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submit = handleSubmit(({ fullName }) => {
    if (dryRun) {
      showPopup(`Name would be saved as “${fullName}” (playground).`, "info");
      onDone();
      return;
    }
    mutation.mutate(
      { currentName, nextName: fullName },
      {
        onSuccess: () => {
          showPopup("Name updated.", "success");
          onDone();
        },
      },
    );
  });

  const message =
    errors.fullName?.message ??
    (mutation.isError ? profileSaveErrorMessage(mutation.error) : null) ??
    (!online ? "You're offline — connect to save." : null);

  return (
    <form onSubmit={submit} noValidate className="w-full text-left">
      <label htmlFor={inputId} className="text-[13px] font-bold text-ink">
        Full name
      </label>
      <input
        id={inputId}
        data-autofocus
        autoFocus
        autoComplete="name"
        maxLength={FULL_NAME_MAX + 10}
        aria-invalid={errors.fullName ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`${textInput} mt-1.5`}
        {...register("fullName")}
      />
      {message ? (
        <p id={errorId} role="alert" className={fieldError}>
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => (onCancel ?? onDone)()}
          disabled={mutation.isPending}
          className={`${secondaryButton} flex-1`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || !online}
          className={`${primaryButton} h-11 flex-1 text-sm`}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
