import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { ProfilePageSkeleton } from "@/components/ui/skeletons";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your account.",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfileScreen />
    </Suspense>
  );
}
