import type { Metadata } from "next";
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
        <EditProfileForm />
      </PullToRefresh>
    </main>
  );
}
