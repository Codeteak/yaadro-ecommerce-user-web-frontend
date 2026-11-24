"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { showPopup } from "@/components/ui/Toast";
import { usePhoneChange } from "@/components/profile/hooks/usePhoneChange";
import {
  OTP_LENGTH,
  formatIndianMobile,
  otpFormSchema,
  phoneChangeFormSchema,
  sanitizeOtpInput,
} from "@/lib/profile-validation";
import {
  fieldError,
  primaryButton,
  textInput,
} from "@/components/profile/profile-styles";

type PhoneChangeSheetProps = {
  open: boolean;
  onClose: () => void;
  currentPhone: string | null;
  online: boolean;
};

function PhoneStep({
  currentPhone,
  online,
  sending,
  serverError,
  onSend,
}: {
  currentPhone: string | null;
  online: boolean;
  sending: boolean;
  serverError: string | null;
  onSend: (digits: string) => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const schema = useMemo(() => phoneChangeFormSchema(currentPhone), [currentPhone]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { phone: "" },
  });
  const message =
    errors.phone?.message ??
    serverError ??
    (!online ? "You're offline — connect to get a code." : null);

  return (
    <form noValidate onSubmit={handleSubmit(({ phone }) => onSend(phone))}>
      <label htmlFor={inputId} className="text-[13px] font-bold text-ink">
        New mobile number
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex h-12 items-center rounded-xl bg-mint/60 px-3 text-[15px] font-bold text-forest">
          +91
        </span>
        <input
          id={inputId}
          data-autofocus
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          maxLength={16}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          className={textInput}
          {...register("phone")}
        />
      </div>
      {message ? (
        <p id={errorId} role="alert" className={fieldError}>
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={sending || !online}
        className={`${primaryButton} mt-5 w-full`}
      >
        {sending ? "Sending code…" : "Send code"}
      </button>
    </form>
  );
}

function CodeStep({
  phone,
  online,
  verifying,
  sending,
  secondsLeft,
  serverError,
  onVerify,
  onResend,
  onChangeNumber,
}: {
  phone: string;
  online: boolean;
  verifying: boolean;
  sending: boolean;
  secondsLeft: number;
  serverError: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: "" },
  });
  const field = register("code");
  const message =
    errors.code?.message ??
    serverError ??
    (!online ? "You're offline — connect to verify." : null);

  return (
    <form noValidate onSubmit={handleSubmit(({ code }) => onVerify(code))}>
      <p className="text-[13px] leading-5 text-muted">
        We sent a {OTP_LENGTH}-digit code to{" "}
        <span className="font-bold text-ink">{formatIndianMobile(phone)}</span>.{" "}
        <button
          type="button"
          onClick={onChangeNumber}
          className="font-bold text-forest underline underline-offset-2"
        >
          Change
        </button>
      </p>
      <label htmlFor={inputId} className="mt-4 block text-[13px] font-bold text-ink">
        Verification code
      </label>
      <input
        id={inputId}
        data-autofocus
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        placeholder={"•".repeat(OTP_LENGTH)}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`${textInput} mt-1.5 text-center text-xl tracking-[0.5em]`}
        {...field}
        onChange={(event) => {
          setValue("code", sanitizeOtpInput(event.target.value), {
            shouldValidate: Boolean(errors.code),
          });
        }}
      />
      {message ? (
        <p id={errorId} role="alert" className={fieldError}>
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={verifying || !online}
        className={`${primaryButton} mt-5 w-full`}
      >
        {verifying ? "Verifying…" : "Verify & update"}
      </button>
      <button
        type="button"
        onClick={onResend}
        disabled={secondsLeft > 0 || sending || !online}
        className="mt-3 w-full text-center text-[13px] font-bold text-forest disabled:text-muted"
      >
        {sending
          ? "Sending…"
          : secondsLeft > 0
            ? `Resend code in ${secondsLeft}s`
            : "Resend code"}
      </button>
    </form>
  );
}

/** Change mobile number: send code to the new number, then verify it. */
export function PhoneChangeSheet({
  open,
  onClose,
  currentPhone,
  online,
}: PhoneChangeSheetProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const flow = usePhoneChange({
    onVerified: () => {
      showPopup("Mobile number updated.", "success");
      onCloseRef.current();
    },
  });

  const close = () => {
    flow.reset();
    onClose();
  };

  useEffect(() => {
    if (!open) flow.reset();
    // Only reset when the sheet closes — avoid clearing mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open gate
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      dismissible={!flow.sending && !flow.verifying}
      title="Change mobile number"
      description="Your number is used to sign in and for delivery updates."
    >
      {flow.step === "enter-code" && flow.phone ? (
        <CodeStep
          key={flow.phone}
          phone={flow.phone}
          online={online}
          verifying={flow.verifying}
          sending={flow.sending}
          secondsLeft={flow.secondsLeft}
          serverError={flow.error}
          onVerify={flow.verifyCode}
          onResend={flow.resend}
          onChangeNumber={flow.changeNumber}
        />
      ) : (
        <PhoneStep
          currentPhone={currentPhone}
          online={online}
          sending={flow.sending}
          serverError={flow.error}
          onSend={flow.sendCode}
        />
      )}
    </BottomSheet>
  );
}
