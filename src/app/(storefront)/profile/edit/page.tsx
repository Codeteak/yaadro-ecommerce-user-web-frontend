import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Edit your Yaadro profile details.",
};

type FieldProps = {
  label: string;
  name: string;
  placeholder: string;
  icon: LucideIcon;
  type?: string;
  autoComplete?: string;
};

function Field({
  label,
  name,
  placeholder,
  icon: Icon,
  type = "text",
  autoComplete,
}: FieldProps) {
  const id = `edit-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl bg-white pr-12 pl-4 text-[15px] text-ink shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5 transition outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-leaf/40"
        />
        <Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted"
          strokeWidth={1.8}
        />
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref="/profile" title="Edit Profile" />

      <PullToRefresh>
        <div className="mt-6 flex justify-center">
          <div className="relative">
            <div className="flex size-28 items-center justify-center rounded-full bg-mint/60 shadow-[0_10px_30px_rgba(47,107,47,0.10)] ring-1 ring-leaf/15">
              <Image
                src="/onboarding/brand-mark-white-y.svg"
                alt=""
                width={58}
                height={69}
                unoptimized
                className="h-16 w-auto object-contain"
              />
            </div>
            <span
              className="absolute right-0 bottom-1 flex size-8 items-center justify-center rounded-full bg-leaf text-white ring-4 ring-paper"
              aria-hidden
            >
              <Plus className="size-4" strokeWidth={2.5} />
            </span>
          </div>
        </div>

        {/* UI only — Save returns to Profile; persistence arrives with the profile API */}
        <form action="/profile" className="mt-8 flex flex-col gap-4">
          <Field label="Full Name" name="fullName" placeholder="Enter your full name" icon={Pencil} autoComplete="name" />
          <Field label="Nickname" name="nickname" placeholder="Enter a nickname" icon={Pencil} autoComplete="nickname" />
          <Field label="Email" name="email" placeholder="Enter your email" icon={Mail} type="email" autoComplete="email" />
          <Field label="Phone" name="phone" placeholder="+91 " icon={Phone} type="tel" autoComplete="tel" />
          <Field label="Address" name="address" placeholder="Enter your address" icon={MapPin} autoComplete="street-address" />
          <Field label="Occupation" name="occupation" placeholder="Enter your occupation" icon={BriefcaseBusiness} />

          <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
            <Link
              href="/profile"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/10 transition hover:ring-leaf/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Discard
            </Link>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-forest to-leaf-bright text-sm font-semibold text-white shadow-[0_8px_20px_rgba(92,184,92,0.30)] transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Save
            </button>
          </div>
          <p className="pb-2 text-center text-xs text-muted">
            UI only — saving will connect when the profile API is available.
          </p>
        </form>
      </PullToRefresh>
    </main>
  );
}
