import { redirect } from "next/navigation";

/** Old `/new` route — send shoppers to home. */
export default function NewArrivalsRedirectPage() {
  redirect("/home");
}
