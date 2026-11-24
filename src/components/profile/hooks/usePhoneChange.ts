"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPhoneChange, verifyPhoneChange } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/errors";
import { PHONE_OTP_RESEND_SECONDS } from "@/lib/profile-validation";
import { PROFILE_QUERY_KEY } from "@/components/profile/hooks/useMyProfile";

export type PhoneChangeStep = "enter-phone" | "enter-code" | "done";

function phoneErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

/**
 * Phone change: send code to the new number → verify 4-digit code.
 * Resend is locked for the shop's cooldown after each send.
 */
export function usePhoneChange({
  onVerified,
}: { onVerified?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<PhoneChangeStep>("enter-phone");
  const [phone, setPhone] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  const secondsLeft =
    resendAt == null ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));

  const send = useMutation({
    mutationFn: (digits: string) => requestPhoneChange(digits),
    onMutate: () => setError(null),
    onSuccess: (_data, digits) => {
      setPhone(digits);
      setStep("enter-code");
      const at = Date.now();
      setNow(at);
      setResendAt(at + PHONE_OTP_RESEND_SECONDS * 1000);
    },
    onError: (err) => {
      setError(phoneErrorMessage(err, "We couldn't send the code. Try again."));
    },
  });

  const verify = useMutation({
    mutationFn: (code: string) => {
      if (!phone) throw new Error("Missing phone");
      return verifyPhoneChange(phone, code);
    },
    onMutate: () => setError(null),
    onSuccess: async () => {
      setStep("done");
      setResendAt(null);
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      onVerified?.();
    },
    onError: (err) => {
      setError(phoneErrorMessage(err, "That code didn't match. Try again."));
    },
  });

  const resend = useCallback(() => {
    if (!phone || secondsLeft > 0 || send.isPending) return;
    send.mutate(phone);
  }, [phone, secondsLeft, send]);

  const changeNumber = useCallback(() => {
    setStep("enter-phone");
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStep("enter-phone");
    setPhone(null);
    setResendAt(null);
    setError(null);
    send.reset();
    verify.reset();
  }, [send, verify]);

  return {
    step,
    phone,
    error,
    secondsLeft,
    sending: send.isPending,
    verifying: verify.isPending,
    sendCode: (digits: string) => send.mutate(digits),
    verifyCode: (code: string) => verify.mutate(code),
    resend,
    changeNumber,
    reset,
  };
}
