"use client";

import { cn } from "@/lib/cn";

type PhoneInputProps = {
  value: string;
  onChange: (digits: string) => void;
  error?: string | null;
  disabled?: boolean;
  id?: string;
};

function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="24" height="16" rx="2" fill="#FF9933" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" strokeWidth="0.7" />
      <circle cx="12" cy="8" r="0.45" fill="#000080" />
    </svg>
  );
}

export function PhoneInput({
  value,
  onChange,
  error,
  disabled,
  id = "login-phone",
}: PhoneInputProps) {
  return (
    <div className="w-full text-left">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        Mobile number
      </label>
      <div
        className={cn(
          "flex h-14 items-center gap-2 rounded-2xl border bg-white px-3 shadow-[0_1px_2px_rgba(15,31,22,0.04)] transition",
          error
            ? "border-red-300 ring-2 ring-red-100"
            : "border-leaf/20 focus-within:border-leaf focus-within:ring-2 focus-within:ring-leaf/20",
          disabled && "opacity-60",
        )}
      >
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-mint/60 px-2.5 py-1.5">
          <IndiaFlag className="h-3.5 w-5 rounded-[2px]" />
          <span className="text-sm font-semibold text-forest">+91</span>
        </span>
        <input
          id={id}
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoCorrect="off"
          spellCheck={false}
          maxLength={15}
          disabled={disabled}
          placeholder="9876543210"
          value={value}
          onChange={(event) => {
            // Keep national 10 digits; strip country code if autofill inserts +91…
            let digits = event.target.value.replace(/\D/g, "");
            if (digits.length > 10 && digits.startsWith("91")) {
              digits = digits.slice(-10);
            }
            onChange(digits.slice(0, 10));
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-medium text-ink outline-none placeholder:text-muted/45"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">Enter your 10-digit Indian mobile number</p>
      )}
    </div>
  );
}
