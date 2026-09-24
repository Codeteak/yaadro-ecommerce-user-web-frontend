'use client';

import { useEffect, useState } from 'react';
import { useLocationService } from '../../context/LocationServiceContext';
import { useShopBranding } from '../../context/ShopBrandingContext';
import { reverseGeocode } from '../../utils/geocoding';
import { buildMapStreetArea } from '../../utils/formatAddress';
import { getStoreCoordinates } from '../../utils/storeLocation';
import { ShopRegular as Store } from '../icons';

function finitePoint(p) {
  if (!p) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatShopPlace(result) {
  if (!result) return null;
  const street = buildMapStreetArea(result);
  const compact = [street, result.city]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
  if (compact) return compact;
  const display = String(result.displayName || '').trim();
  return display || null;
}

/**
 * Shop contact card using existing branding + shop hub coordinates (label only).
 * No phone field exists in current shop APIs — do not invent one.
 */
export default function ProfileShopContactSection() {
  const { shopLocation } = useLocationService();
  const { shopName } = useShopBranding();
  const brand = (shopName || 'Yaadro').trim() || 'Yaadro';
  const point = finitePoint(shopLocation) || finitePoint(getStoreCoordinates());
  const pointKey =
    point != null ? `${point.lat.toFixed(5)},${point.lng.toFixed(5)}` : '';
  const [addressLabel, setAddressLabel] = useState(null);
  const [labelFailed, setLabelFailed] = useState(false);

  useEffect(() => {
    if (!pointKey || !point) {
      setAddressLabel(null);
      return undefined;
    }
    let cancelled = false;
    setLabelFailed(false);
    void reverseGeocode(point.lat, point.lng)
      .then((result) => {
        if (cancelled) return;
        setAddressLabel(formatShopPlace(result));
      })
      .catch(() => {
        if (cancelled) return;
        setAddressLabel(null);
        setLabelFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // pointKey gates re-fetch; point is derived from the same coords.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key
  }, [pointKey]);

  return (
    <section
      className="mx-4 mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-slide-up motion-reduce:animate-none"
      style={{ animationDelay: '80ms' }}
      aria-label="Shop contact"
    >
      <div className="border-b border-gray-50 px-4 py-3">
        <h3 className="text-base font-bold text-gray-900">Shop contact</h3>
        <p className="text-xs text-gray-500">Where your orders are fulfilled</p>
      </div>

      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Store size={20} className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{brand}</p>
          {addressLabel ? (
            <p className="mt-1 text-[13px] leading-snug text-gray-600">{addressLabel}</p>
          ) : labelFailed || !point ? (
            <p className="mt-1 text-[13px] text-gray-500">
              Shop information is currently unavailable.
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-gray-400">Looking up area…</p>
          )}
        </div>
      </div>
    </section>
  );
}
