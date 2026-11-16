import type { Metadata } from "next";
import Image from "next/image";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import { EditProfileForm } from "@/components/profile/EditProfileForm";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Edit your Yaadro profile details.",
};

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

        <EditProfileForm />
      </PullToRefresh>
    </main>
  );
}
