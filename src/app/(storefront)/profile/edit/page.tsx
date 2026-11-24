import { redirect } from "next/navigation";

/** Edit lives inline on `/profile` — keep the old URL working. */
export default function EditProfilePage() {
  redirect("/profile?edit=1");
}
