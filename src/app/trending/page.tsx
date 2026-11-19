import { redirect } from "next/navigation";

/** Old `/trending` route — send shoppers to home. */
export default function TrendingRedirectPage() {
  redirect("/home");
}
