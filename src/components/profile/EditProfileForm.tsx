"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Mail, MapPin, Pencil, BriefcaseBusiness } from "lucide-react";
import { ApiError, firstFieldError } from "@/lib/api/errors";
import {
  getMyProfile,
  requestPhoneChange,
  updateMyProfile,
  verifyPhoneChange,
} from "@/lib/api/profile";
import { saveMyAddress } from "@/lib/api/address";
import { hasCustomerSession, subscribeCustomerSession } from "@/lib/api/session";
import { showPopup } from "@/components/ui/Toast";
import { useSyncExternalStore } from "react";

export function EditProfileForm() {
  const signedIn = useSyncExternalStore(subscribeCustomerSession, hasCustomerSession, () => false);
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => getMyProfile(signal),
    enabled: signedIn,
  });
  const [name, setName] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [line1, setLine1] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loaded = profile.data;
  const nameValue = name ?? loaded?.user.name ?? "";
  const nicknameValue = nickname ?? loaded?.customer.displayName ?? "";
  const lineValue = line1 ?? loaded?.address?.line1 ?? "";
  const cityValue = city ?? loaded?.address?.city ?? "";

  const save = useMutation({
    mutationFn: async () => {
      await updateMyProfile({
        name: nameValue.trim() || null,
        displayName: nicknameValue.trim() || null,
        address: lineValue.trim()
          ? {
              line1: lineValue.trim(),
              city: cityValue.trim() || null,
              line2: loaded?.address?.line2 ?? null,
              landmark: loaded?.address?.landmark ?? null,
              lat: loaded?.address?.lat ?? null,
              lng: loaded?.address?.lng ?? null,
            }
          : undefined,
      });
      if (lineValue.trim()) {
        await saveMyAddress({
          line1: lineValue.trim(),
          city: cityValue.trim() || null,
          line2: loaded?.address?.line2 ?? null,
          landmark: loaded?.address?.landmark ?? null,
          lat: loaded?.address?.lat ?? null,
          lng: loaded?.address?.lng ?? null,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setFormError(null);
      showPopup("Profile saved.", "success");
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? (firstFieldError(error) ?? error.message)
          : "We couldn't save your profile. Try again.";
      setFormError(message);
      showPopup(message, "error");
    },
  });

  const sendOtp = useMutation({
    mutationFn: () => requestPhoneChange(phone.trim()),
    onSuccess: () => {
      setOtpSent(true);
      setFormError(null);
      showPopup("We sent a code to your new number.", "success");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not send the code.";
      setFormError(message);
    },
  });

  const confirmOtp = useMutation({
    mutationFn: () => verifyPhoneChange(phone.trim(), otp.trim()),
    onSuccess: async () => {
      setOtp("");
      setOtpSent(false);
      setPhone("");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      showPopup("Phone number updated.", "success");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "That code didn't match.";
      setFormError(message);
    },
  });

  if (!signedIn) {
    return (
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/login?next=/profile/edit" className="font-semibold text-leaf">
          Sign in
        </Link>{" "}
        to edit your profile.
      </p>
    );
  }

  if (profile.isPending) {
    return <div className="mt-8 h-40 animate-pulse rounded-2xl bg-mint/50" />;
  }

  if (profile.isError) {
    const message =
      profile.error instanceof ApiError
        ? profile.error.message
        : "We couldn't load your profile.";
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-muted">{message}</p>
        <button
          type="button"
          onClick={() => void profile.refetch()}
          className="mt-4 text-sm font-semibold text-leaf"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-8 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Field label="Full Name" value={nameValue} onChange={setName} autoComplete="name" icon="name" />
      <Field
        label="Nickname"
        value={nicknameValue}
        onChange={setNickname}
        autoComplete="nickname"
        icon="name"
      />
      <Field label="Email" value="" disabled placeholder="Not stored for this shop" icon="mail" />
      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Phone</p>
        <p className="mb-2 text-sm text-muted">{loaded?.user.phone ?? "No phone on file"}</p>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="New phone, if you want to change it"
          className="h-14 w-full rounded-2xl bg-white px-4 text-[15px] text-ink ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-leaf/40"
        />
        {phone.trim() ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={sendOtp.isPending}
              onClick={() => sendOtp.mutate()}
              className="h-10 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50"
            >
              {sendOtp.isPending ? "Sending…" : "Send code"}
            </button>
            {otpSent ? (
              <>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  inputMode="numeric"
                  maxLength={4}
                  aria-label="OTP"
                  className="h-10 w-24 rounded-full bg-white px-3 text-center ring-1 ring-black/10 outline-none"
                />
                <button
                  type="button"
                  disabled={confirmOtp.isPending || otp.trim().length !== 4}
                  onClick={() => confirmOtp.mutate()}
                  className="h-10 rounded-full bg-leaf px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Confirm
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <Field label="Address" value={lineValue} onChange={setLine1} autoComplete="street-address" icon="map" />
      <Field label="City" value={cityValue} onChange={setCity} autoComplete="address-level2" icon="map" />
      <Field label="Occupation" value="" disabled placeholder="Not stored for this shop" icon="work" />
      {formError ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
        <Link
          href="/profile"
          className="inline-flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-black/10"
        >
          Discard
        </Link>
        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-forest to-leaf-bright text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  autoComplete,
  icon,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  icon: "name" | "mail" | "map" | "work";
}) {
  const Icon = icon === "mail" ? Mail : icon === "map" ? MapPin : icon === "work" ? BriefcaseBusiness : Pencil;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="relative block">
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className="h-14 w-full rounded-2xl bg-white pr-12 pl-4 text-[15px] text-ink ring-1 ring-black/5 outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-leaf/40 disabled:bg-white/70"
        />
        <Icon aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
