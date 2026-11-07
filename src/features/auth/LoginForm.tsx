"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SwipeAction } from "@/components/ui/SwipeAction";
import { validateLoginPhone, validateOtp } from "@/lib/validations/auth";
import { OtpInput } from "./OtpInput";
import { PhoneInput } from "./PhoneInput";

type Step = "phone" | "otp";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const maskedPhone = phone
    ? `+91 ${phone.slice(0, 2)}****${phone.slice(-4)}`
    : "";

  const onSendOtp = async () => {
    const error = validateLoginPhone(phone);
    setPhoneError(error);
    if (error) return;

    setPending(true);
    // UI-only stub — real requestOtp API will replace this later.
    await new Promise((resolve) => setTimeout(resolve, 350));
    setPending(false);
    setOtp("");
    setOtpError(null);
    setStep("otp");
  };

  const onVerifyOtp = async () => {
    const error = validateOtp(otp);
    setOtpError(error);
    if (error) return false;

    setPending(true);
    // UI-only stub — real verifyOtp + session handling will replace this later.
    await new Promise((resolve) => setTimeout(resolve, 350));
    setPending(false);
    router.push("/home", { transitionTypes: ["login-forward"] });
    return true;
  };

  return (
    <form
      className="w-full text-left"
      autoComplete="on"
      method="post"
      action="#"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "phone") void onSendOtp();
        else void onVerifyOtp();
      }}
    >
      {step === "phone" ? (
        <div className="space-y-6">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
              Sign in
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-muted">
              Enter your mobile number to receive a one-time password.
            </p>
          </div>

          <PhoneInput
            value={phone}
            error={phoneError}
            disabled={pending}
            onChange={(digits) => {
              setPhone(digits);
              if (phoneError) setPhoneError(null);
            }}
          />

          <button
            type="submit"
            disabled={pending || phone.length !== 10}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-track text-sm font-semibold text-black transition hover:bg-leaf-bright disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            {pending ? "Sending…" : "Send OTP"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.14em] text-leaf uppercase">
              Verify
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
              Enter OTP
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-muted">
              We sent a 4-digit code to{" "}
              <span className="font-semibold text-ink">{maskedPhone}</span>
            </p>
          </div>

          <OtpInput
            value={otp}
            error={otpError}
            disabled={pending}
            onChange={(code) => {
              setOtp(code);
              if (otpError) setOtpError(null);
            }}
          />

          <SwipeAction
            label="Swipe to login"
            disabled={pending || otp.length !== 4}
            onComplete={onVerifyOtp}
          />

          <div className="flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              disabled={pending}
              onClick={onSendOtp}
              className="font-semibold text-leaf transition hover:text-leaf-bright disabled:opacity-50"
            >
              Resend OTP
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setStep("phone");
                setOtp("");
                setOtpError(null);
              }}
              className="font-medium text-muted transition hover:text-ink disabled:opacity-50"
            >
              Change number
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
