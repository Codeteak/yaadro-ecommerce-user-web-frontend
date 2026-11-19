"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SwipeAction } from "@/components/ui/SwipeAction";
import { useShopName } from "@/components/shop/ShopNameProvider";
import {
  AuthApiError,
  hasCustomerSession,
  requestCustomerOtp,
  saveCustomerSession,
  subscribeCustomerSession,
  verifyCustomerOtp,
} from "@/lib/api/auth";
import { validateLoginPhone, validateOtp } from "@/lib/validations/auth";
import { OtpInput } from "./OtpInput";
import { PhoneInput } from "./PhoneInput";
import { VerifiedSuccess } from "./VerifiedSuccess";

type Step = "phone" | "otp" | "welcome";

/** Short beat after session is saved before leaving for /home. */
const WELCOME_HOLD_MS = 900;
/** Keep swipe check animation brief so welcome can appear ASAP. */
const SWIPE_HOLD_MS = 80;
const LOGIN_RESET_KEY = "yaadro.login.reset";

export function LoginForm({
  shopName: shopNameProp,
}: {
  /** Override shop brand (playground). Else ShopNameProvider / “Yaadro”. */
  shopName?: string;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const contextShop = useShopName();
  const shopName = shopNameProp?.trim() || contextShop;
  const signedIn = useSyncExternalStore(
    subscribeCustomerSession,
    hasCustomerSession,
    () => false,
  );
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Welcome is shown immediately; navigate only after verify succeeds. */
  const [sessionReady, setSessionReady] = useState(false);

  const maskedPhone = phone
    ? `+91 ${phone.slice(0, 2)}****${phone.slice(-4)}`
    : "";

  // Soft-nav back to /login can restore a prior "welcome" step from the router
  // cache after logout. Reset only on logout mark / signed-in → signed-out —
  // not while welcome is up and verify is still in flight (!signedIn yet).
  const prevSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    let markedLogout = false;
    try {
      markedLogout = window.sessionStorage.getItem(LOGIN_RESET_KEY) === "1";
      if (markedLogout) window.sessionStorage.removeItem(LOGIN_RESET_KEY);
    } catch {
      // ignore
    }
    const becameSignedOut =
      prevSignedIn.current === true && signedIn === false;
    prevSignedIn.current = signedIn;

    if (!markedLogout && !becameSignedOut) return;

    setStep("phone");
    setSessionReady(false);
    setPending(false);
    setOtp("");
    setOtpError(null);
  }, [signedIn]);

  useEffect(() => {
    if (step !== "welcome" || !sessionReady || !hasCustomerSession()) return;
    const timer = window.setTimeout(() => {
      router.push(nextPath, { transitionTypes: ["login-forward"] });
      router.refresh();
    }, WELCOME_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [step, sessionReady, nextPath, router]);

  const onSendOtp = async () => {
    const error = validateLoginPhone(phone);
    setPhoneError(error);
    if (error) return;

    setPending(true);
    try {
      await requestCustomerOtp(phone);
      setOtp("");
      setOtpError(null);
      setStep("otp");
    } catch (err) {
      const message =
        err instanceof AuthApiError
          ? err.message
          : "Could not send the OTP. Try again.";
      if (step === "otp") setOtpError(message);
      else setPhoneError(message);
    } finally {
      setPending(false);
    }
  };

  const onVerifyOtp = async () => {
    const error = validateOtp(otp);
    setOtpError(error);
    if (error) return false;

    // Show welcome immediately — don't wait on the OTP screen for the API.
    setSessionReady(false);
    setStep("welcome");
    setPending(true);
    try {
      const session = await verifyCustomerOtp(phone, otp);
      saveCustomerSession(session);
      setSessionReady(true);
      return true;
    } catch (err) {
      setSessionReady(false);
      setStep("otp");
      setOtpError(
        err instanceof AuthApiError
          ? err.message
          : "Could not verify the OTP. Try again.",
      );
      return false;
    } finally {
      setPending(false);
    }
  };

  if (step === "welcome") {
    return (
      <VerifiedSuccess
        shopName={shopName}
        status={sessionReady ? "success" : "confirming"}
      />
    );
  }

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
              Enter your mobile number. A new number is registered when the code is verified.
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
            holdMs={SWIPE_HOLD_MS}
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

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}
