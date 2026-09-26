'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys } from '../../../hooks/useCart';
import { addressKeys } from '../../../hooks/useAddresses';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  ArrowLeftRegular as ArrowLeft,
  CheckRegular as Check,
  Loading2Regular as Loader2,
  MapPinRegular as MapPin,
} from '../../../components/icons';
import { useAddress } from '../../../context/AddressContext';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/ConfirmModal';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { updateProfile, resolveShopId } from '../../../utils/authApi';
import { normalizePhoneForApi } from '../../../utils/otpVerifyPayload';
import {
  clearPendingCustomerName,
  getPendingCustomerName,
} from '../../../utils/pendingCustomerName';
import { getIndianPhoneSubmitError } from '../../../utils/indianPhone';
import IndianPhoneInput from '../../../components/IndianPhoneInput';
import { haversineKm, formatDistanceKm } from '../../../utils/geoDistance';
import { getStoreCoordinates } from '../../../utils/storeLocation';
import { checkDeliveryLocation } from '../../../utils/storefrontLocationApi';
import {
  getAddressSaveErrorMessage,
  getPinDeliveryCheckMessage,
} from '../../../utils/apiErrors';
import { useLocationService } from '../../../context/LocationServiceContext';
import { sanitizeAddressNotes } from '../../../utils/addressApi';
import { sanitizeStoredStreetArea } from '../../../utils/formatAddress';
import { isUnauthorizedError } from '../../../utils/authErrors';
import { useLoginNavigation } from '../../../hooks/useLoginNavigation';
import { PRESSABLE_ICON_BTN_SOFT } from '../../../components/ui/brandButton';

// Leaflet uses `window` at import time — load only on the client.
const AddressMapPicker = dynamic(
  () => import('../../../components/AddressMapPicker'),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 animate-pulse bg-gray-100" />,
  }
);

const ALLOWED_RETURN_ROUTES = new Set(['/checkout', '/addresses', '/']);

function buildAddressFromExisting(addr) {
  if (!addr) return null;
  // Apartment / building is customer-typed — never seed from map/geocode text.
  const line1 = String(addr.line1 || addr.apartment || addr.flat || addr.building || '').trim();
  // line2 is street/area only — strip leftover city/state/PIN from older saves.
  // Do not fall back to displayName / Plus Codes from map providers.
  const line2 = sanitizeStoredStreetArea(String(addr.line2 || '').trim(), addr);
  return {
    label: addr.label || 'Home',
    line1,
    line2,
    landmark: addr.landmark || '',
    city: addr.city || '',
    raw: sanitizeAddressNotes(addr.raw),
  };
}

const EMPTY_FORM = {
  label: 'Home',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  raw: '',
};

function backupStorageKey(addressId) {
  return `yaadro_address_edit_prev_${addressId}`;
}

function abandonedSessionKey(addressId) {
  return `yaadro_address_edit_abandoned_${addressId}`;
}

function keptContactName(address, profileName) {
  return String(address?.fullName || profileName || '').trim();
}

function addressEditSignature({ form, coords, name }) {
  const lat = coords?.lat != null ? Number(coords.lat) : null;
  const lng = coords?.lng != null ? Number(coords.lng) : null;
  return JSON.stringify({
    label: String(form?.label || 'Home'),
    line1: String(form?.line1 || '').trim(),
    line2: String(form?.line2 || '').trim(),
    landmark: String(form?.landmark || '').trim(),
    city: String(form?.city || '').trim(),
    raw: sanitizeAddressNotes(form?.raw) || '',
    lat: Number.isFinite(lat) ? lat.toFixed(4) : null,
    lng: Number.isFinite(lng) ? lng.toFixed(4) : null,
    name: String(name || '').trim(),
  });
}

function buildEditSnapshot(editingAddress) {
  if (!editingAddress?.id) return null;
  const lat = editingAddress.lat != null ? Number(editingAddress.lat) : null;
  const lng = editingAddress.lng != null ? Number(editingAddress.lng) : null;
  return {
    version: 1,
    savedAt: Date.now(),
    addressId: String(editingAddress.id),
    form: buildAddressFromExisting(editingAddress) ?? { ...EMPTY_FORM },
    coords:
      lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : null,
    nameDraft: String(editingAddress.fullName || ''),
    phoneDraft: String(editingAddress.phone || ''),
  };
}

export default function AddAddressPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sp = useSearchParams();
  const fromParam = sp.get('from') || '';
  const editId = sp.get('id') || '';
  const returnTo = ALLOWED_RETURN_ROUTES.has(fromParam) ? fromParam : '/addresses';

  const { user, refreshUser } = useAuth();
  const { ok, ready } = useRequireAuth();
  const { goToLogin } = useLoginNavigation();
  const {
    addresses = [],
    addAddress,
    updateAddress,
    isCreating,
    isUpdating,
    isLoading: addressesLoading,
  } = useAddress();
  const { shopLocation: contextShopLocation } = useLocationService();

  const editingAddress = useMemo(
    () => (editId ? addresses.find((a) => String(a.id) === String(editId)) : null),
    [editId, addresses]
  );
  const isEdit = Boolean(editingAddress?.id);

  // New address: map first. Edit: open the saved details, map stays at the bottom.
  const [step, setStep] = useState(() => (editId ? 2 : 1));

  // ── Coordinates from map (never reverse-geocode into form fields) ──
  const [coords, setCoords] = useState(null);
  const [mapFocusRequest, setMapFocusRequest] = useState(null);

  /** GPS position for "your location" vs pinned centre (fixed pin flow). */
  const [userLocation, setUserLocation] = useState(null);
  const [userGeoStatus, setUserGeoStatus] = useState('loading'); // loading | idle | denied | unavailable

  const storeCoords = useMemo(() => getStoreCoordinates(), []);

  // ── Form fields (step 2) — edit flow hydrates via effect (backup + clear or restore) ──
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [touched, setTouched] = useState({});

  // ── Contact (name / phone) ──
  const nameFromProfile = (user?.name || '').trim();
  const phoneFromProfile = (user?.phone || '').trim();
  const nameFromPending = getPendingCustomerName(phoneFromProfile || user?.phone);
  const needsName = !nameFromProfile;
  const needsPhone = !phoneFromProfile;
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [submitError, setSubmitError] = useState('');
  const line1InputRef = useRef(null);
  const nameInputRef = useRef(null);
  const phoneSectionRef = useRef(null);
  const formScrollRef = useRef(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editBaseline, setEditBaseline] = useState(null);
  const editInitForIdRef = useRef(null);
  /** After a successful save, skip leave guards and navigate away on back. */
  const saveCompletedRef = useRef(false);
  const lastSavedAddressIdRef = useRef(null);

  const savedName = keptContactName(editingAddress, nameFromProfile || nameFromPending);

  // Edit opens on the saved address. Name stays filled from the profile or this address.
  useEffect(() => {
    if (!isEdit || !editingAddress?.id || String(editingAddress.id) !== String(editId)) return;
    if (editInitForIdRef.current === editId) return;

    const backupKey = backupStorageKey(editId);
    const abandonedKey = abandonedSessionKey(editId);
    const existing = buildAddressFromExisting(editingAddress) ?? { ...EMPTY_FORM };
    const savedLat = editingAddress.lat != null ? Number(editingAddress.lat) : null;
    const savedLng = editingAddress.lng != null ? Number(editingAddress.lng) : null;
    const savedCoords =
      savedLat != null &&
      savedLng != null &&
      Number.isFinite(savedLat) &&
      Number.isFinite(savedLng)
        ? { lat: savedLat, lng: savedLng }
        : null;
    const name = keptContactName(editingAddress, nameFromProfile);

    try {
      const snapshot = buildEditSnapshot(editingAddress);
      if (snapshot && typeof localStorage !== 'undefined') {
        localStorage.setItem(backupKey, JSON.stringify(snapshot));
      }

      const abandoned =
        typeof sessionStorage !== 'undefined' && sessionStorage.getItem(abandonedKey) === '1';
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(backupKey) : null;
      let nextForm = existing;
      let nextCoords = savedCoords;
      let nextName = name;

      if (abandoned && raw) {
        const snap = JSON.parse(raw);
        if (snap?.form && typeof snap.form === 'object') {
          nextForm = { ...EMPTY_FORM, ...snap.form };
        }
        if (snap?.coords?.lat != null && snap?.coords?.lng != null) {
          nextCoords = { lat: Number(snap.coords.lat), lng: Number(snap.coords.lng) };
        }
        if (typeof snap?.nameDraft === 'string' && snap.nameDraft.trim()) {
          nextName = snap.nameDraft.trim();
        }
        if (typeof snap?.phoneDraft === 'string' && !phoneFromProfile) {
          setPhoneDraft(snap.phoneDraft);
        }
        sessionStorage.removeItem(abandonedKey);
      } else if (!phoneFromProfile) {
        setPhoneDraft('');
      }

      setForm(nextForm);
      setCoords(nextCoords);
      setNameDraft(nextName);
      setEditBaseline({
        form: existing,
        coords: savedCoords,
        name,
      });
      setStep(2);
      setTouched({});
      saveCompletedRef.current = false;
      editInitForIdRef.current = editId;
    } catch (e) {
      console.warn('Address edit init backup failed', e);
      setForm(existing);
      setCoords(savedCoords);
      setNameDraft(name);
      setEditBaseline({ form: existing, coords: savedCoords, name });
      setStep(2);
      editInitForIdRef.current = editId;
    }
  }, [isEdit, editingAddress, editId, nameFromProfile, phoneFromProfile]);

  // Profile name can arrive after the address. Fill an empty name without wiping a typed one.
  useEffect(() => {
    if (!isEdit || !savedName) return;
    setNameDraft((prev) => (String(prev || '').trim() ? prev : savedName));
    setEditBaseline((prev) => {
      if (!prev || String(prev.name || '').trim()) return prev;
      return { ...prev, name: savedName };
    });
  }, [isEdit, savedName]);

  // New address: seed name from local pending draft (OTP onboarding) when profile is empty.
  useEffect(() => {
    if (isEdit) return;
    if (nameFromProfile) return;
    if (!nameFromPending) return;
    setNameDraft((prev) => (String(prev || '').trim() ? prev : nameFromPending));
  }, [isEdit, nameFromProfile, nameFromPending]);

  const hasEditChanges = useMemo(() => {
    if (!isEdit || !editBaseline) return false;
    return (
      addressEditSignature({ form, coords, name: nameDraft || savedName }) !==
      addressEditSignature(editBaseline)
    );
  }, [isEdit, editBaseline, form, coords, nameDraft, savedName]);

  useEffect(() => {
    if (!isEdit || !hasEditChanges || saveCompletedRef.current) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isEdit, hasEditChanges]);

  useEffect(() => {
    if (!editId) editInitForIdRef.current = null;
  }, [editId]);

  // ── GPS: remember user position for distance UI + seed map centre when none saved. ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserGeoStatus('unavailable');
      return;
    }
    setUserGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setUserGeoStatus('unavailable');
          return;
        }
        setUserLocation({ lat, lng });
        setUserGeoStatus('idle');
        setCoords((prev) => {
          if (prev?.lat != null && prev?.lng != null) return prev;
          // Edit flow seeds the pin from the saved address; do not override with GPS.
          if (editId) return prev;
          return { lat, lng };
        });
      },
      () => setUserGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120_000 }
    );
  }, [editId]);

  const deliveryMetrics = useMemo(() => {
    if (!coords?.lat || !coords?.lng) return null;
    let userVsPinKm = null;
    if (userLocation?.lat != null && userLocation?.lng != null) {
      userVsPinKm = haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
    }
    return { userVsPinKm };
  }, [coords, userLocation]);

  /** Live delivery check for the map pin (debounced). null = unknown (never treat as false). */
  const [pinDeliveryCheck, setPinDeliveryCheck] = useState({
    loading: false,
    serviceable: null,
    distanceM: null,
    maxRadiusM: null,
    shopLocation: null,
    error: null,
  });

  useEffect(() => {
    if (!coords?.lat || !coords?.lng) {
      setPinDeliveryCheck({
        loading: false,
        serviceable: null,
        distanceM: null,
        maxRadiusM: null,
        shopLocation: null,
        error: null,
      });
      return undefined;
    }
    const checkLat = Number(coords.lat);
    const checkLng = Number(coords.lng);
    if (!Number.isFinite(checkLat) || !Number.isFinite(checkLng)) return undefined;

    let cancelled = false;
    // Invalidate previous pin result immediately so Save cannot use a stale "serviceable".
    setPinDeliveryCheck((prev) => ({
      ...prev,
      loading: true,
      error: null,
      serviceable: null,
    }));
    const t = window.setTimeout(async () => {
      try {
        const data = await checkDeliveryLocation(checkLat, checkLng);
        if (cancelled) return;
        setPinDeliveryCheck({
          loading: false,
          serviceable:
            data.serviceable === true ? true : data.serviceable === false ? false : null,
          distanceM: data.distanceM ?? null,
          maxRadiusM: data.maxRadiusM ?? null,
          shopLocation: data.shopLocation ?? null,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        // Network/API failure must not keep a previous "serviceable=true" for this pin.
        setPinDeliveryCheck((prev) => ({
          ...prev,
          loading: false,
          serviceable: null,
          error: e,
        }));
      }
    }, 420);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [coords?.lat, coords?.lng]);

  const effectiveStoreLocation = useMemo(() => {
    if (pinDeliveryCheck.shopLocation?.lat != null && pinDeliveryCheck.shopLocation?.lng != null) {
      return pinDeliveryCheck.shopLocation;
    }
    if (contextShopLocation?.lat != null && contextShopLocation?.lng != null) {
      return contextShopLocation;
    }
    return storeCoords;
  }, [pinDeliveryCheck.shopLocation, contextShopLocation, storeCoords]);

  // ── Validation (step 2) — only Address Line 1 required (matches backend) ──
  const validation = useMemo(() => {
    const errors = {};
    if (!form.line1.trim()) errors.line1 = 'Please enter Address Line 1.';

    const nameForCheck = (nameDraft.trim() || nameFromProfile || savedName).trim();
    if (!nameForCheck || nameForCheck.length < 2) errors.name = 'Enter your full name';
    if (needsPhone) {
      const phoneErr = getIndianPhoneSubmitError(phoneDraft);
      if (phoneErr) errors.phone = phoneErr;
    }

    return { errors, ok: Object.keys(errors).length === 0 };
  }, [form, needsPhone, nameDraft, phoneDraft, nameFromProfile, savedName]);

  const err = (key) => (touched[key] ? validation.errors[key] : '');
  const inputCls = (key) =>
    `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
      err(key)
        ? 'border-red-300 focus:ring-red-100'
        : 'border-gray-200 focus:ring-violet-200'
    }`;

  const focusFirstAddressError = useCallback((errors) => {
    const order = ['name', 'phone', 'line1'];
    const firstKey = order.find((k) => errors?.[k]);
    const refMap = {
      name: nameInputRef,
      phone: phoneSectionRef,
      line1: line1InputRef,
    };
    const target = firstKey ? refMap[firstKey]?.current : null;
    if (target) {
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (typeof target.focus === 'function') {
        window.setTimeout(() => target.focus(), 280);
      }
      return;
    }
    formScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, []);

  const setField = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  // ── Map → coordinates only (do not auto-fill address form / notes) ──
  const handleMapChange = useCallback(({ lat, lng }) => {
    setCoords({ lat, lng });
  }, []);

  // ── Submit ──
  const buildPayload = (nameResolved, phoneResolved) => {
    const line1 = form.line1.trim();
    const line2 = form.line2.trim();
    const combinedStreet = [line1, line2].filter(Boolean).join(', ');

    return {
      label: form.label,
      line1,
      line2,
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      raw: sanitizeAddressNotes(form.raw) || null,
      street: combinedStreet,
      address: combinedStreet || line1,
      fullName: nameResolved,
      phone: normalizePhoneForApi(phoneResolved),
      isDefault: true,
    };
  };

  const navigateBackWith = useCallback(
    (newId) => {
      const params = new URLSearchParams();
      if (returnTo === '/checkout' && newId) params.set('selectAddress', newId);
      const target = params.toString() ? `${returnTo}?${params.toString()}` : returnTo;
      router.replace(target);
    },
    [returnTo, router]
  );

  const requestLeave = useCallback(() => {
    if (saveCompletedRef.current) {
      navigateBackWith(lastSavedAddressIdRef.current);
      return;
    }
    // New address, or an edit with nothing changed — leave immediately.
    if (!isEdit || step === 1 || !hasEditChanges) {
      router.replace(returnTo);
      return;
    }
    setShowLeaveModal(true);
  }, [isEdit, hasEditChanges, step, router, returnTo, navigateBackWith]);

  const confirmLeaveIncompleteEdit = useCallback(() => {
    if (!saveCompletedRef.current && editId && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(abandonedSessionKey(editId), '1');
    }
    setShowLeaveModal(false);
    router.replace(returnTo);
  }, [editId, router, returnTo]);

  const handleSave = async () => {
    if (isCreating || isUpdating) return;
    setSubmitError('');
    setTouched({
      name: true,
      phone: true,
      line1: true,
    });
    if (!validation.ok) {
      focusFirstAddressError(validation.errors);
      return;
    }

    if (!coords?.lat || !coords?.lng) {
      setSubmitError('Please select a delivery location on the map.');
      if (!isEdit) setStep(1);
      return;
    }

    if (pinDeliveryCheck.loading || pinDeliveryCheck.serviceable !== true) {
      setSubmitError(
        pinDeliveryCheck.serviceable === false
          ? "This location is outside the available delivery area. Move the pin inside the delivery zone to save."
          : pinDeliveryCheck.error
            ? 'Could not verify delivery for this pin. Check your connection and try again.'
            : 'Please wait until delivery availability is confirmed for this pin.',
      );
      if (!isEdit) setStep(1);
      return;
    }

    const finalName = (nameDraft.trim() || nameFromProfile || nameFromPending || savedName).trim();
    const finalPhone = needsPhone
      ? normalizePhoneForApi(phoneDraft)
      : normalizePhoneForApi(phoneFromProfile);

    try {
      const shopId = await resolveShopId();
      if (!shopId) {
        setSubmitError('Shop is not configured. Please refresh the page and try again.');
        return;
      }

      if (finalName && finalName !== nameFromProfile) {
        await updateProfile({ displayName: finalName });
        await refreshUser({ silent: true });
        clearPendingCustomerName(phoneFromProfile || finalPhone || user?.phone);
      }

      const payload = buildPayload(finalName, finalPhone);

      let createdId = null;
      if (isEdit && editingAddress?.id) {
        await updateAddress(editingAddress.id, payload);
        createdId = editingAddress.id;
      } else {
        const created = await addAddress(payload);
        createdId = created?.id || null;
      }

      if (payload.lat != null && payload.lng != null) {
        try {
          await checkDeliveryLocation(payload.lat, payload.lng);
        } catch (locErr) {
          // Address is already saved — do not fail the save UX on cookie/location check.
          // Checkout will re-verify serviceability with a clear message.
          console.warn('[address] post-save location check failed', locErr);
        }
      }

      if (typeof window !== 'undefined' && editId) {
        try {
          localStorage.removeItem(backupStorageKey(editId));
          sessionStorage.removeItem(abandonedSessionKey(editId));
        } catch {
          /* noop */
        }
      }

      void queryClient.invalidateQueries({ queryKey: addressKeys.all });
      if (returnTo === '/checkout') {
        void queryClient.invalidateQueries({ queryKey: cartKeys.all });
      }

      setShowLeaveModal(false);
      saveCompletedRef.current = true;
      lastSavedAddressIdRef.current = createdId;
      navigateBackWith(createdId);
    } catch (e) {
      // Keep all form fields — customer only needs to fix the failing piece and retry.
      if (isUnauthorizedError(e)) {
        setSubmitError('Your session expired. Please sign in again to save your address.');
        goToLogin(`/add/address?from=${encodeURIComponent(returnTo)}${editId ? `&id=${encodeURIComponent(editId)}` : ''}`);
        return;
      }
      const saveMsg = getAddressSaveErrorMessage(e);
      setSubmitError(saveMsg);
      if (/Address Line 1/i.test(saveMsg)) {
        focusFirstAddressError({ line1: saveMsg });
      }
    }
  };

  const submitting = isCreating || isUpdating;

  // Guests: useRequireAuth → home; spinner while loading or redirecting.
  if (!ready || !ok || (editId && addressesLoading && !editingAddress)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={32} className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Map pin preview — coordinates only (customer enters address on step 2).
  const previewLine1 = coords
    ? 'Location selected'
    : 'Choose a delivery point';
  const previewLine2 = coords
    ? `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`
    : 'Pan the map or use My location';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Step 2 header — back + title (kept compact). Step 1 is fully chromeless;
          its back button floats over the map next to the search bar. */}
      {step === 2 && (
        <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => (isEdit ? requestLeave() : setStep(1))}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 ${PRESSABLE_ICON_BTN_SOFT}`}
            aria-label={isEdit ? 'Cancel' : 'Back'}
          >
            <ArrowLeft size={16} className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            {!isEdit && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                Step 2 of 2
              </p>
            )}
            <h1 className="truncate text-base font-semibold text-gray-900">
              {isEdit ? 'Edit address' : 'Add address details'}
            </h1>
          </div>
        </div>
      )}

      {/* ===== STEP 1: Map + bottom card (no page header — back button floats over the map) ===== */}
      {step === 1 && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative flex-1">
            <AddressMapPicker
              variant="fullscreen"
              centerPinMode
              height="100%"
              value={coords}
              onChange={handleMapChange}
              userLocation={userLocation}
              storeLocation={effectiveStoreLocation}
              showStoreMarker
              focusRequest={mapFocusRequest}
            />

            {/* Floating back button — sits to the left of the map's search bar */}
            <button
              type="button"
              onClick={requestLeave}
              aria-label="Back"
              className={`absolute left-3 top-3 z-[1100] inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md hover:bg-gray-50 ${PRESSABLE_ICON_BTN_SOFT}`}
              style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
              <ArrowLeft size={16} className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom sticky confirm card */}
          <div
            className="relative z-10 shrink-0 border-t border-gray-100 bg-white px-4 pt-4 shadow-[0_-12px_30px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {/* Delivery at map pin — bottom sheet (same area as distance / confirm) */}
            <div
              className={`mb-4 rounded-2xl border px-3 py-3 ${
                pinDeliveryCheck.loading
                  ? 'border-gray-200 bg-gray-50 text-gray-800'
                  : pinDeliveryCheck.error
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : pinDeliveryCheck.serviceable === true
                      ? 'border-violet-200 bg-violet-50 text-violet-950'
                      : pinDeliveryCheck.serviceable === false
                        ? 'border-red-200 bg-red-50 text-red-950'
                        : 'border-gray-200 bg-gray-50 text-gray-800'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Delivery at map pin
              </p>
              <p
                className={`mt-1 text-[13px] font-medium ${
                  !pinDeliveryCheck.loading &&
                  !pinDeliveryCheck.error &&
                  pinDeliveryCheck.serviceable === true
                    ? 'text-[14px] font-bold text-violet-900'
                    : ''
                }`}
              >
                {getPinDeliveryCheckMessage({
                  loading: pinDeliveryCheck.loading,
                  error: pinDeliveryCheck.error,
                  serviceable: pinDeliveryCheck.serviceable,
                })}
              </p>
              {!pinDeliveryCheck.loading &&
                !pinDeliveryCheck.error &&
                pinDeliveryCheck.serviceable === false && (
                  <p className="mt-0.5 text-[12px] text-red-800">
                    This location is outside the available delivery area. Move the
                    pin inside the delivery zone to continue.
                  </p>
                )}
              {!pinDeliveryCheck.loading && pinDeliveryCheck.error && (
                <p className="mt-0.5 text-[12px] text-amber-900">
                  Could not verify this pin right now. Check your connection and
                  try again — Save stays disabled until delivery is confirmed.
                </p>
              )}
            </div>

            {/* Distance strip — your GPS vs map pin */}
            {deliveryMetrics && (
              <div className="mb-4 grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                <button
                  type="button"
                  onClick={() => {
                    if (userLocation?.lat == null || userLocation?.lng == null) return;
                    setMapFocusRequest({
                      target: 'user',
                      lat: userLocation.lat,
                      lng: userLocation.lng,
                      zoom: 17,
                      ts: Date.now(),
                    });
                  }}
                  disabled={userLocation?.lat == null || userLocation?.lng == null}
                  className="flex w-full items-start gap-3 rounded-xl text-left transition hover:bg-gray-100/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Image
                    src="/home-icon.png"
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 object-contain"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Your location
                    </p>
                    {userGeoStatus === 'loading' && (
                      <p className="mt-0.5 text-[12px] text-gray-600">Finding your location…</p>
                    )}
                    {userGeoStatus === 'denied' && (
                      <p className="mt-0.5 text-[12px] text-gray-600">
                        Location access denied — tap the crosshair on the map to jump to your GPS and compare.
                      </p>
                    )}
                    {userGeoStatus !== 'loading' &&
                      userGeoStatus !== 'denied' &&
                      deliveryMetrics.userVsPinKm != null &&
                      deliveryMetrics.userVsPinKm < 0.08 && (
                      <p className="mt-0.5 text-[12px] font-medium text-violet-800">
                        Pinned spot matches your current area
                      </p>
                    )}
                    {userGeoStatus !== 'loading' &&
                      userGeoStatus !== 'denied' &&
                      deliveryMetrics.userVsPinKm != null &&
                      deliveryMetrics.userVsPinKm >= 0.08 && (
                      <p className="mt-0.5 text-[12px] text-gray-800">
                        Pinned location is{' '}
                        <span className="font-semibold">
                          {formatDistanceKm(deliveryMetrics.userVsPinKm)}
                        </span>{' '}
                        from your location
                      </p>
                    )}
                    {userGeoStatus === 'unavailable' && (
                      <p className="mt-0.5 text-[12px] text-gray-600">
                        Location unavailable on this device.
                      </p>
                    )}
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                <MapPin size={16} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Selected location
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-gray-900">
                  {previewLine1}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">{previewLine2}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!coords) {
                  setSubmitError('Pan the map to choose your delivery point.');
                  return;
                }
                setSubmitError('');
                if (isEdit && editingAddress) {
                  const existing = buildAddressFromExisting(editingAddress);
                  if (existing) {
                    setForm((prev) => ({
                      ...existing,
                      ...prev,
                      label: prev.label || existing.label,
                      line1: String(prev.line1 || '').trim() ? prev.line1 : existing.line1,
                      line2: String(prev.line2 || '').trim() ? prev.line2 : existing.line2,
                      landmark: String(prev.landmark || '').trim()
                        ? prev.landmark
                        : existing.landmark,
                      city: String(prev.city || '').trim() ? prev.city : existing.city,
                      raw: sanitizeAddressNotes(prev.raw) || sanitizeAddressNotes(existing.raw),
                    }));
                  }
                }
                setStep(2);
              }}
              disabled={
                !coords ||
                pinDeliveryCheck.loading ||
                pinDeliveryCheck.serviceable !== true
              }
              className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-sm transition active:scale-[0.99] ${
                coords &&
                !pinDeliveryCheck.loading &&
                pinDeliveryCheck.serviceable === true
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-500'
              }`}
            >
              <Check size={16} className="h-4 w-4" />
              {pinDeliveryCheck.loading
                ? 'Checking delivery…'
                : 'Confirm location'}
            </button>

            {submitError && step === 1 && (
              <p className="mt-2 text-center text-xs text-red-600">{submitError}</p>
            )}
          </div>
        </div>
      )}

      {/* ===== STEP 2: Details form ===== */}
      {step === 2 && (
        <div className="flex min-h-0 flex-1 flex-col">
          {!isEdit && (
            <div className="shrink-0 border-b border-gray-100 bg-violet-50/40 px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] text-violet-900">
                <MapPin size={16} className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1 font-medium">{previewLine1}</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto flex-shrink-0 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <div ref={formScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {Object.keys(validation.errors).length > 0 &&
              (touched.line1 || touched.name || touched.phone) && (
                <div
                  role="alert"
                  className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-red-950"
                >
                  <p className="text-[13px] font-semibold">Please complete the following</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12px]">
                    {validation.errors.name && <li>{validation.errors.name}</li>}
                    {validation.errors.phone && <li>{validation.errors.phone}</li>}
                    {validation.errors.line1 && <li>{validation.errors.line1}</li>}
                  </ul>
                </div>
              )}

            <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Contact
              </p>
              {isEdit || needsName ? (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-gray-800">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="name"
                    placeholder="Name as on phone bill / ID"
                    className={inputCls('name')}
                  />
                  {err('name') && <p className="mt-1 text-xs text-red-600">{err('name')}</p>}
                </div>
              ) : (
                <p className="mt-1 text-sm font-medium text-gray-900">{nameFromProfile}</p>
              )}

              {needsPhone ? (
                <div ref={phoneSectionRef} className="mt-3">
                  <label className="text-xs font-semibold text-gray-800">
                    Mobile number <span className="text-red-500">*</span>
                  </label>
                  <IndianPhoneInput
                    value={phoneDraft}
                    onChange={(v) => {
                      setPhoneDraft(v);
                      setSubmitError('');
                    }}
                    inputClassName={inputCls('phone')}
                    placeholder="10-digit mobile"
                    showValidHint={false}
                  />
                  {err('phone') && (
                    <p className="mt-1 text-xs text-red-600">{err('phone')}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-800">{phoneFromProfile}</p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Label</label>
                <select
                  value={form.label}
                  onChange={setField('label')}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Address line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  ref={line1InputRef}
                  value={form.line1}
                  onChange={setField('line1')}
                  placeholder="House number, building, street"
                  className={inputCls('line1')}
                />
                {err('line1') && <p className="mt-1 text-xs text-red-600">{err('line1')}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Address line 2 
                </label>
                <input
                  value={form.line2}
                  onChange={setField('line2')}
                  placeholder="Auto-filled from selected map location"
                  className={inputCls('line2')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Landmark <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  value={form.landmark}
                  onChange={setField('landmark')}
                  placeholder="Nearby landmark"
                  className={inputCls('landmark')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={setField('city')}
                  placeholder="City (optional)"
                  className={inputCls('city')}
                />
                {err('city') && <p className="mt-1 text-xs text-red-600">{err('city')}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Delivery notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={form.raw}
                  onChange={setField('raw')}
                  rows={2}
                  placeholder="Gate code, floor, instructions…"
                  className={`${inputCls('raw')} resize-none`}
                />
              </div>

              {isEdit && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-700">Delivery location</p>
                  <p className="mt-0.5 text-[12px] text-gray-500">
                    Move the pin if this address needs a different spot.
                  </p>
                  <div className="mt-2">
                    <AddressMapPicker
                      variant="card"
                      centerPinMode
                      height={220}
                      value={coords}
                      onChange={handleMapChange}
                      userLocation={userLocation}
                      storeLocation={effectiveStoreLocation}
                      showStoreMarker
                      focusRequest={mapFocusRequest}
                    />
                  </div>
                  <p
                    className={`mt-2 text-[12px] font-medium ${
                      pinDeliveryCheck.serviceable === false
                        ? 'text-red-700'
                        : pinDeliveryCheck.serviceable === true
                          ? 'text-violet-800'
                          : 'text-gray-600'
                    }`}
                  >
                    {getPinDeliveryCheckMessage({
                      loading: pinDeliveryCheck.loading,
                      error: pinDeliveryCheck.error,
                      serviceable: pinDeliveryCheck.serviceable,
                    })}
                  </p>
                </div>
              )}

              {submitError && (
                <p className="text-center text-xs text-red-600">{submitError}</p>
              )}
            </div>
          </div>

          {/* Footer save bar */}
          <div
            className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 shadow-[0_-4px_14px_rgba(0,0,0,0.06)]"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className={isEdit ? 'flex gap-2' : ''}>
            {isEdit && (
              <button
                type="button"
                onClick={requestLeave}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={
                submitting ||
                (isEdit && !hasEditChanges) ||
                pinDeliveryCheck.loading ||
                pinDeliveryCheck.serviceable !== true
              }
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100 disabled:shadow-none ${
                isEdit ? 'flex-[1.4]' : 'w-full'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check size={16} className="h-4 w-4" />
                  {isEdit ? 'Save changes' : 'Save address'}
                </>
              )}
            </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showLeaveModal}
        overlayClassName="z-[1200]"
        onClose={() => setShowLeaveModal(false)}
        onConfirm={confirmLeaveIncompleteEdit}
        title="Leave without finishing?"
        message="You have not saved this address update. Your previous address is stored on this device — if you leave, you can open edit again to restore it, or enter a new address from scratch. Your account still has the last saved address until you complete Save."
        confirmText="Leave"
        cancelText="Keep editing"
      />
    </div>
  );
}
