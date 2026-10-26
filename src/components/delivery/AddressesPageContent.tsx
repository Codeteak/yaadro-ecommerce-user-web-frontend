"use client";

import { PageHeader } from "@/components/navigation/PageHeader";
import { SavedAddressesManageList } from "@/components/delivery/SavedAddressesManageList";

/**
 * Profile → Address Management. Same manage list as playground
 * (star / edit / delete / Add New Address).
 */
export function AddressesPageContent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5">
      <PageHeader backHref="/profile" title="Addresses" />

      <div className="flex flex-1 flex-col pb-10">
        <p className="text-[13px] leading-5 text-muted">
          Star a default, edit details, or remove an address. Used for home
          Deliver to and checkout.
        </p>
        <SavedAddressesManageList className="mt-5" />
      </div>
    </main>
  );
}
