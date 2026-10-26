"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import {
  formatDeliveryAddressLabel,
  readDeliveryAddress,
  subscribeDeliveryAddress,
} from "@/lib/delivery-address";

function getServerLabel() {
  return null as string | null;
}

function getClientLabel() {
  const saved = readDeliveryAddress();
  if (!saved) return null;
  return formatDeliveryAddressLabel(saved) || null;
}

/**
 * Hero top bar: shop avatar + name, Deliver to under the name, Sign in.
 * Tapping the location line opens the shared address sheet.
 */
export function HomeTopBar({
  shopName,
  shopImage,
}: {
  shopName: string;
  shopImage: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const addressLabel = useSyncExternalStore(
    subscribeDeliveryAddress,
    getClientLabel,
    getServerLabel,
  );

  return (
    <>
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {shopImage.startsWith("http") ? (
            // Remote shop profile (host unknown ahead of time) — plain img.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shopImage}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80"
            />
          ) : (
            <Image
              src={shopImage}
              alt=""
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-bold text-forest">
              {shopName}
            </p>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-1 flex max-w-full cursor-pointer items-start gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-black" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[9px] font-bold tracking-[0.16em] text-black uppercase">
                  Deliver to
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate text-[13px] leading-tight font-semibold text-leaf">
                    {addressLabel ?? "Choose your location"}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 text-leaf/60"
                    aria-hidden
                  />
                </span>
              </span>
            </button>
          </div>
        </div>
        <Link
          href="/login"
          className="shrink-0 rounded-full bg-track px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Sign in
        </Link>
      </header>

      <AddressBookSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
