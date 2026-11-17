"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";

/**
 * Profile → Address. One delivery address for home and checkout.
 */
export function AddressesPageContent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref="/profile" title="Address" />

      <div className="flex flex-1 flex-col pb-10">
        <p className="text-[13px] leading-5 text-muted">
          Your delivery address for home and checkout.
        </p>
        <SavedAddressesManageList className="mt-5" />
      </div>
    </main>
  );
}
