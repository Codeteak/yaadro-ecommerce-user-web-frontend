"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useState,
} from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  formatDeliveryLocationLabel,
  getDeliveryAddressServerSnapshot,
  hasBrowseLocation,
  hasDeliveryDetails,
  hasDeliveryPin,
  isOutsideDeliveryRadius,
  readDeliveryAddress,
  subscribeDeliveryAddress,
} from "@/lib/delivery-address";
import { DELIVERY_OUTSIDE_RADIUS_LABEL } from "@/lib/location-messages";
import {
  getCachedProfileUiServerSnapshot,
  readCachedProfileUi,
  subscribeCachedProfileUi,
} from "@/lib/profile-cache";
import { refreshDeliveryServiceable } from "@/lib/refresh-delivery-serviceable";
import {
  getSelectedAddress,
  isSavedAddressDetailsComplete,
  listSavedAddresses,
} from "@/lib/saved-addresses";

/** Only this link subscribes to the session, so the address row does not re-render. */
function AccountLink({ signedIn }: { signedIn?: boolean }) {
  const live = useCustomerSignedIn();
  const showProfile = signedIn ?? live;
  const cached = useSyncExternalStore(
    subscribeCachedProfileUi,
    readCachedProfileUi,
    getCachedProfileUiServerSnapshot,
  );

  // Fixed slot so Sign in ↔ profile icon does not shift the hero (CLS).
  return (
    <div className="flex h-11 w-[5.75rem] shrink-0 items-center justify-end self-start">
      {showProfile ? (
        <Link
          href="/profile"
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          aria-label="Profile"
        >
          <ProfileAvatar
            name={cached?.displayName}
            seed={cached?.userId}
            size="sm"
            className="shadow-[0_6px_16px_rgba(47,107,47,0.16)] ring-leaf/20"
          />
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-track px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

/**
 * Hero top bar: shop avatar + name, Deliver to under the name, Sign in
 * or the profile icon. Tapping the location line opens the address sheet.
 * Omit `signedIn` to follow the real session. Pass it only for a preview.
 */
export function HomeTopBar({
  shopName,
  shopImage,
  signedIn,
  previewOutsideRadius,
  previewAddressLabel,
}: {
  shopName: string;
  shopImage: string;
  /** Preview override. Leave unset on the storefront. */
  signedIn?: boolean;
  /** Playground: force the red outside-radius Deliver-to line. */
  previewOutsideRadius?: boolean;
  /** Playground: force the Deliver-to label (ignored when outside preview). */
  previewAddressLabel?: string | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEditId, setSheetEditId] = useState<string | null>(null);
  const [sheetStep, setSheetStep] = useState<"list" | "map" | "details">(
    "list",
  );

  const delivery = useSyncExternalStore(
    subscribeDeliveryAddress,
    readDeliveryAddress,
    getDeliveryAddressServerSnapshot,
  );

  const liveOutside = isOutsideDeliveryRadius(delivery);
  const outside = previewOutsideRadius === true || liveOutside;
  const addressLabel =
    previewOutsideRadius === true
      ? DELIVERY_OUTSIDE_RADIUS_LABEL
      : previewAddressLabel !== undefined
        ? previewAddressLabel
        : outside
          ? DELIVERY_OUTSIDE_RADIUS_LABEL
          : hasBrowseLocation(delivery)
            ? formatDeliveryLocationLabel(delivery)
            : null;

  // Existing pins (or server sync) may lack `serviceable` — check once per pin.
  const serviceableCheckKey = useRef<string | null>(null);
  useEffect(() => {
    if (previewOutsideRadius != null || previewAddressLabel !== undefined) {
      return;
    }
    if (
      !delivery ||
      !hasDeliveryPin(delivery) ||
      typeof delivery.serviceable === "boolean"
    ) {
      return;
    }
    const { lat, lng } = delivery;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const key = `${lat},${lng}`;
    if (serviceableCheckKey.current === key) return;
    serviceableCheckKey.current = key;
    let cancelled = false;
    void refreshDeliveryServiceable(lat, lng).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [delivery, previewAddressLabel, previewOutsideRadius]);

  const openAddressSheet = () => {
    const current = readDeliveryAddress();
    const saved = getSelectedAddress() ?? listSavedAddresses()[0] ?? null;
    if (hasDeliveryDetails(current) || isSavedAddressDetailsComplete(saved)) {
      setSheetEditId(saved?.id ?? null);
      setSheetStep("details");
    } else if (hasBrowseLocation(current) || saved) {
      // Pin-only: open details so they can complete when they want.
      setSheetEditId(saved?.id ?? null);
      setSheetStep(saved ? "details" : "map");
    } else {
      setSheetEditId(null);
      setSheetStep("map");
    }
    setSheetOpen(true);
  };

  const onSheetOpenChange = useCallback((next: boolean) => {
    setSheetOpen(next);
    if (!next) setSheetEditId(null);
  }, []);

  const pinColor = outside ? "text-red-600" : "text-black";
  const labelColor = outside ? "text-red-600" : "text-leaf";
  const chevronColor = outside ? "text-red-600/70" : "text-leaf/60";
  const eyebrowColor = outside ? "text-red-600" : "text-black";

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
              width={44}
              height={44}
              decoding="async"
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
              onClick={openAddressSheet}
              className="mt-1 flex max-w-full cursor-pointer items-start gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
            >
              <MapPin
                className={`mt-0.5 h-4 w-4 shrink-0 ${pinColor}`}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className={`block text-[9px] font-bold tracking-[0.16em] uppercase ${eyebrowColor}`}
                >
                  Deliver to
                </span>
                <span className="flex min-h-[1.25rem] min-w-0 items-center gap-1">
                  <span
                    className={`min-w-0 truncate text-[13px] leading-tight font-semibold ${labelColor}`}
                  >
                    {addressLabel ?? "Choose your location"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 ${chevronColor}`}
                    aria-hidden
                  />
                </span>
              </span>
            </button>
          </div>
        </div>
        <AccountLink signedIn={signedIn} />
      </header>

      <AddressBookSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        initialStep={sheetStep}
        editId={sheetEditId}
      />
    </>
  );
}
