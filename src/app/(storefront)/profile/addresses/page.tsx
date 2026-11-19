import { redirect } from "next/navigation";

/**
 * #31 — address lives in a profile modal, not a dedicated page.
 * Keep this route so old links (Help FAQ, bookmarks) still work.
 */
export default function AddressesPage() {
  redirect("/profile?address=1");
}
