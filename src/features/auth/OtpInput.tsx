"use client";

import {
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: string | null;
  disabled?: boolean;
  id?: string;
};

export function OtpInput({
  value,
  onChange,
  length = 4,
  error,
  disabled,
  id = "login-otp",
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const setDigit = (index: number, next: string) => {
    const chars = digits.slice();
    chars[index] = next;
    onChange(chars.join("").slice(0, length));
  };

  const focusAt = (index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const onDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigit(index, "");
      return;
    }
    if (cleaned.length > 1) {
      // Paste or autofill into one box
      const merged = (value.slice(0, index) + cleaned).replace(/\D/g, "").slice(0, length);
      onChange(merged);
      focusAt(Math.min(merged.length, length - 1));
      return;
    }
    setDigit(index, cleaned);
    if (index < length - 1) focusAt(index + 1);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        event.preventDefault();
        setDigit(index - 1, "");
        focusAt(index - 1);
      }
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, length - 1));
  };

  return (
    <div className="w-full text-left">
      <p id={`${id}-label`} className="mb-3 text-sm font-semibold text-ink">
        Enter OTP
      </p>
      <div
        className="flex justify-between gap-2 sm:gap-3"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {digits.map((digit, index) => {
          const filled = Boolean(digit);
          return (
            <input
              key={`${id}-${index}`}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              id={index === 0 ? id : undefined}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={length}
              disabled={disabled}
              value={digit}
              aria-label={`Digit ${index + 1} of ${length}`}
              onChange={(event) => onDigitChange(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
              onFocus={(event) => event.target.select()}
              className={cn(
                "h-14 w-14 rounded-2xl border bg-white text-center text-xl font-bold text-ink shadow-[0_1px_2px_rgba(15,31,22,0.04)] outline-none transition sm:h-16 sm:w-16 sm:text-2xl",
                filled
                  ? "border-leaf bg-mint/40 ring-2 ring-leaf/25"
                  : "border-leaf/20",
                "focus:border-leaf focus:ring-2 focus:ring-leaf/30",
                error && !filled && "border-red-300",
                disabled && "opacity-60",
              )}
            />
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
