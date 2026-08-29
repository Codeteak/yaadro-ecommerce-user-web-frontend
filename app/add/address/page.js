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
import GuestAuthPrompt from '../../../components/GuestAuthPrompt';
import ConfirmModal from '../../../components/ConfirmModal';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { reverseGeocode } from '../../../utils/geocoding';
import { updateProfile, resolveShopId } from '../../../utils/authApi';
import { normalizePhoneForApi } from '../../../utils/otpVerifyPayload';
import { getIndianPhoneSubmitError } from '../../../utils/indianPhone';
import IndianPhoneInput from '../../../components/IndianPhoneInput';
import { haversineKm, formatDistanceKm } from '../../../utils/geoDistance';
import { getStoreCoordinates } from '../../../utils/storeLocation';
import { checkDeliveryLocation } from '../../../utils/storefrontLocationApi';
import { useLocationService } from '../../../context/LocationServiceContext';

/** Map circle + UI when API has not returned a max radius yet (meters). */
const DELIVERY_RADIUS_FALLBACK_M = Number(process.env.NEXT_PUBLIC_DELIVERY_RADIUS_FALLBACK_M) || 8000;

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
  const line1 = String(
    addr.building ||
      addr.apartment ||
      addr.flat ||
      addr.line1 ||
      (typeof addr.street === 'string' ? addr.street.split(',')[0] : '') ||
      ''
  ).trim();
  return {
    label: addr.label || 'Home',
    line1,
    line2:
      addr.line2 ||
      addr.displayName ||
      [
        addr.landmark,
        addr.city,
        addr.state,
        addr.postalCode || addr.zipCode,
        addr.country,
      ]
        .filter(Boolean)
        .join(', '),
    landmark: addr.landmark || '',
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postalCode || addr.zipCode || '',
    country: addr.country || 'India',
    raw: addr.raw != null ? String(addr.raw) : '',
  };
}

const EMPTY_FORM = {
  label: 'Home',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  raw: '',
};

function backupStorageKey(addressId) {
  return `yaadro_address_edit_prev_${addressId}`;
}

function abandonedSessionKey(addressId) {
  return `yaadro_address_edit_abandoned_${addressId}`;
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
  const { addresses = [], addAddress, updateAddress, isCreating, isUpdating } = useAddress();
  const { maxRadiusM: locationMaxRadiusM } = useLocationService();

  const editingAddress = useMemo(
    () => (editId ? addresses.find((a) => String(a.id) === String(editId)) : null),
    [editId, addresses]
  );
  const isEdit = Boolean(editingAddress?.id);

  // ── 2-step flow ──
  const [step, setStep] = useState(1);

  // ── Coordinates / resolved address from map ──
  const [coords, setCoords] = useState(null);

  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [resolvingStatus, setResolvingStatus] = useState('idle'); // idle | loading | error
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
  const needsName = !nameFromProfile;
  const needsPhone = !phoneFromProfile;
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [submitError, setSubmitError] = useState('');

  // ── PIN code lookup (postalpincode.in) — same behaviour as the previous sheet ──
  const [pinLookupStatus, setPinLookupStatus] = useState('idle');
  const [pinLookupMessage, setPinLookupMessage] = useState('');
  const pinCacheRef = useRef(new Map());
  const pinAbortRef = useRef(null);
  const lastPinRef = useRef('');

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const editInitForIdRef = useRef(null);
  /** After a successful save, skip leave guards and navigate away on back. */
  const saveCompletedRef = useRef(false);
  const lastSavedAddressIdRef = useRef(null);

  const markDirty = useCallback(() => {
    if (isEdit) setIsDraftDirty(true);
  }, [isEdit]);

  // Edit mode: backup previous address to localStorage, then clear form for a fresh entry.
  // If user left without saving earlier (abandoned), restore from backup instead of clearing again.
  useEffect(() => {
    if (!isEdit || !editingAddress?.id || String(editingAddress.id) !== String(editId)) return;
    if (editInitForIdRef.current === editId) return;

    const backupKey = backupStorageKey(editId);
    const abandonedKey = abandonedSessionKey(editId);

    try {
      const abandoned =
        typeof sessionStorage !== 'undefined' && sessionStorage.getItem(abandonedKey) === '1';
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(backupKey) : null;

      if (abandoned && raw) {
        const snap = JSON.parse(raw);
        if (snap?.form && typeof snap.form === 'object') {
          setForm({ ...EMPTY_FORM, ...snap.form });
        } else {
          setForm({ ...EMPTY_FORM });
        }
        if (snap?.coords?.lat != null && snap?.coords?.lng != null) {
          setCoords({ lat: Number(snap.coords.lat), lng: Number(snap.coords.lng) });
        } else {
          setCoords(null);
        }
        if (typeof snap?.nameDraft === 'string' && !nameFromProfile) setNameDraft(snap.nameDraft);
        if (typeof snap?.phoneDraft === 'string' && !phoneFromProfile) setPhoneDraft(snap.phoneDraft);
        setResolvedAddress(null);
        setResolvingStatus('idle');
        setStep(1);
        setTouched({});
        setIsDraftDirty(false);
        lastPinRef.current = '';
        sessionStorage.removeItem(abandonedKey);
        editInitForIdRef.current = editId;
        return;
      }

      const snapshot = buildEditSnapshot(editingAddress);
      if (snapshot && typeof localStorage !== 'undefined') {
        localStorage.setItem(backupKey, JSON.stringify(snapshot));
      }

      setForm({ ...EMPTY_FORM });
      const savedLat =
        editingAddress.lat != null ? Number(editingAddress.lat) : null;
      const savedLng =
        editingAddress.lng != null ? Number(editingAddress.lng) : null;
      if (
        savedLat != null &&
        savedLng != null &&
        Number.isFinite(savedLat) &&
        Number.isFinite(savedLng)
      ) {
        setCoords({ lat: savedLat, lng: savedLng });
      } else {
        setCoords(null);
      }
      setResolvedAddress(null);
      setResolvingStatus('idle');
      setStep(1);
      setTouched({});
      if (!nameFromProfile) setNameDraft('');
      if (!phoneFromProfile) setPhoneDraft('');
      setIsDraftDirty(false);
      saveCompletedRef.current = false;
      lastPinRef.current = '';
      editInitForIdRef.current = editId;
    } catch (e) {
      console.warn('Address edit init backup failed', e);
      editInitForIdRef.current = editId;
    }
  }, [isEdit, editingAddress, editId, nameFromProfile, phoneFromProfile]);

  useEffect(() => {
    if (!isEdit || !isDraftDirty || saveCompletedRef.current) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isEdit, isDraftDirty]);

  useEffect(() => {
    if (!editId) editInitForIdRef.current = null;
  }, [editId]);

  // ── PIN auto-fill effect (debounced) ──
  useEffect(() => {
    const pin = String(form.postalCode || '').replace(/\D/g, '').slice(0, 6);
    const country = String(form.country || '').toLowerCase().trim();
    const isIndia =
      !country || country === 'india' || country === 'in' || country === 'bharat';

    if (!/^\d{6}$/.test(pin) || !isIndia) return undefined;
    if (lastPinRef.current === pin) return undefined;

    const shouldFillCity = !touched.city && !String(form.city || '').trim();
    const shouldFillState = !touched.state && !String(form.state || '').trim();
    if (!shouldFillCity && !shouldFillState) return undefined;

    lastPinRef.current = pin;
    setPinLookupStatus('fetching');
    setPinLookupMessage('Fetching city/state…');

    if (pinAbortRef.current) {
      try {
        pinAbortRef.current.abort();
      } catch {
        /* noop */
      }
    }
    const ctrl = new AbortController();
    pinAbortRef.current = ctrl;

    const cached = pinCacheRef.current.get(pin);
    if (cached?.city && cached?.state) {
      setForm((prev) => ({
        ...prev,
        ...(shouldFillCity ? { city: cached.city } : {}),
        ...(shouldFillState ? { state: cached.state } : {}),
      }));
      setPinLookupStatus('success');
      setPinLookupMessage(`Auto-filled: ${cached.city}, ${cached.state}`);
      return undefined;
    }

    const t = setTimeout(() => {
      fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((json) => {
          const po = json?.[0]?.PostOffice?.[0];
          const city = (po?.District || po?.Block || po?.Name || '').trim();
          const state = (po?.State || '').trim();
          if (!city || !state) throw new Error('No match');

          pinCacheRef.current.set(pin, { city, state });
          setForm((prev) => ({
            ...prev,
            ...(shouldFillCity ? { city } : {}),
            ...(shouldFillState ? { state } : {}),
          }));
          setPinLookupStatus('success');
          setPinLookupMessage(`Auto-filled: ${city}, ${state}`);
        })
        .catch((e) => {
          if (e?.name === 'AbortError') return;
          setPinLookupStatus('error');
          setPinLookupMessage('Could not auto-fill city/state. Enter manually.');
        });
    }, 350);

    return () => {
      clearTimeout(t);
      try {
        ctrl.abort();
      } catch {
        /* noop */
      }
    };
  }, [form.postalCode, form.country, form.city, form.state, touched.city, touched.state]);

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

  /** Live delivery check for the map pin (debounced). */
  const [pinDeliveryCheck, setPinDeliveryCheck] = useState({
    loading: false,
    serviceable: null,
    distanceM: null,
    maxRadiusM: null,
    error: null,
  });

  useEffect(() => {
    if (!coords?.lat || !coords?.lng) {
      setPinDeliveryCheck({
        loading: false,
        serviceable: null,
        distanceM: null,
        maxRadiusM: null,
        error: null,
      });
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setPinDeliveryCheck((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await checkDeliveryLocation(coords.lat, coords.lng);
        if (cancelled) return;
        setPinDeliveryCheck({
          loading: false,
          serviceable: !!data.serviceable,
          distanceM: data.distanceM,
          maxRadiusM: data.maxRadiusM,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setPinDeliveryCheck({
          loading: false,
          serviceable: null,
          distanceM: null,
          maxRadiusM: null,
          error: e?.message || 'Could not verify delivery',
        });
      }
    }, 420);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [coords?.lat, coords?.lng]);

  const mapDeliveryRadiusM =
    pinDeliveryCheck.maxRadiusM ??
    (typeof locationMaxRadiusM === 'number' && locationMaxRadiusM > 0
      ? locationMaxRadiusM
      : null) ??
    DELIVERY_RADIUS_FALLBACK_M;

  // ── On editing (with existing coords) → reverse geocode once for preview text ──
  useEffect(() => {
    if (!coords || resolvedAddress) return;
    let cancelled = false;
    (async () => {
      try {
        setResolvingStatus('loading');
        const r = await reverseGeocode(coords.lat, coords.lng);
        if (cancelled) return;
        if (r) {
          setResolvedAddress(r);
          setResolvingStatus('idle');
        } else {
          setResolvingStatus('error');
        }
      } catch {
        if (!cancelled) setResolvingStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation (step 2) ──
  const validation = useMemo(() => {
    const errors = {};
    if (!form.line1.trim()) errors.line1 = 'Building / Apartment No is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.state.trim()) errors.state = 'State is required';
    const pin = form.postalCode.replace(/\s/g, '').trim();
    if (!pin) errors.postalCode = 'PIN code is required';
    else if (!/^\d{6}$/.test(pin)) errors.postalCode = 'Enter a valid 6-digit PIN';

    if (needsName) {
      const n = nameDraft.trim();
      if (!n || n.length < 2) errors.name = 'Enter your full name';
    }
    if (needsPhone) {
      const phoneErr = getIndianPhoneSubmitError(phoneDraft);
      if (phoneErr) errors.phone = phoneErr;
    }

    return { errors, ok: Object.keys(errors).length === 0 };
  }, [form, isEdit, needsName, needsPhone, nameDraft, phoneDraft]);

  const err = (key) => (touched[key] ? validation.errors[key] : '');
  const inputCls = (key) =>
    `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
      err(key)
        ? 'border-red-300 focus:ring-red-100'
        : 'border-gray-200 focus:ring-violet-200'
    }`;

  const setField = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    markDirty();
  };

  const setPostalCode = (e) => {
    const digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, postalCode: digits }));
    setTouched((prev) => ({ ...prev, postalCode: true }));
    setPinLookupStatus('idle');
    setPinLookupMessage('');
    markDirty();
  };

  // ── Map → form auto-fill (only blanks; never overwrites touched fields) ──
  const handleMapChange = useCallback(
    ({ lat, lng }) => {
      setCoords({ lat, lng });
      markDirty();
    },
    [markDirty]
  );

  const applyGeocodedAddressToForm = useCallback((resolved, { overwriteLine1 = false } = {}) => {
    if (!resolved) return;
    setForm((prev) => {
      const next = { ...prev };
      const line1FromMap =
        String(resolved.line1 || '').trim() ||
        String(resolved.displayName || '').trim() ||
        [resolved.landmark, resolved.line2].filter(Boolean).join(', ').trim();

      if (overwriteLine1 && line1FromMap) {
        next.line1 = line1FromMap;
      } else if (!String(prev.line1 || '').trim() && line1FromMap) {
        next.line1 = line1FromMap;
      }

      const fullMapAddress =
        String(resolved.displayName || '').trim() ||
        [
          resolved.line1,
          resolved.line2,
          resolved.landmark,
          resolved.city,
          resolved.state,
          resolved.postalCode,
          resolved.country,
        ]
          .filter(Boolean)
          .join(', ');

      const shouldFillLine2 =
        (((!touched.line2 && !String(prev.line2 || '').trim()) || !String(prev.line2 || '').trim()) &&
          fullMapAddress) ||
        (overwriteLine1 && fullMapAddress);
      if (shouldFillLine2) {
        next.line2 = fullMapAddress;
      }

      if (!String(prev.landmark || '').trim() && resolved.landmark) next.landmark = resolved.landmark;
      if (!String(prev.city || '').trim() && resolved.city) next.city = resolved.city;
      if (!String(prev.state || '').trim() && resolved.state) next.state = resolved.state;
      if (!String(prev.postalCode || '').trim() && /^\d{6}$/.test(resolved.postalCode || '')) {
        next.postalCode = resolved.postalCode;
      }
      if (!String(prev.country || '').trim() && resolved.country) next.country = resolved.country;
      return next;
    });
  }, [touched.line2]);

  const handleMapAddress = useCallback(
    (resolved) => {
      setResolvedAddress(resolved);
      setResolvingStatus('idle');
      markDirty();
      applyGeocodedAddressToForm(resolved, { overwriteLine1: step === 1 });
    },
    [markDirty, step, applyGeocodedAddressToForm]
  );

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
      state: form.state.trim(),
      postalCode: form.postalCode.replace(/\s/g, '').trim(),
      country: form.country || 'India',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      raw: form.raw.trim() || null,
      street: combinedStreet,
      address: combinedStreet || line1,
      zipCode: form.postalCode.replace(/\s/g, '').trim(),
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
    if (!isEdit) {
      router.replace(returnTo);
      return;
    }
    if (!isDraftDirty && step === 1) {
      router.replace(returnTo);
      return;
    }
    setShowLeaveModal(true);
  }, [isEdit, isDraftDirty, step, router, returnTo, navigateBackWith]);

  const confirmLeaveIncompleteEdit = useCallback(() => {
    if (!saveCompletedRef.current && editId && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(abandonedSessionKey(editId), '1');
    }
    setShowLeaveModal(false);
    router.replace(returnTo);
  }, [editId, router, returnTo]);

  const handleSave = async () => {
    setSubmitError('');
    setTouched({
      name: true,
      phone: true,
      line1: true,
      city: true,
      state: true,
      postalCode: true,
    });
    if (!validation.ok) return;

    if (!coords?.lat || !coords?.lng) {
      setSubmitError('Please pick a location on the map first.');
      setStep(1);
      return;
    }

    const finalName = needsName ? nameDraft.trim() : nameFromProfile;
    const finalPhone = needsPhone
      ? normalizePhoneForApi(phoneDraft)
      : normalizePhoneForApi(phoneFromProfile);

    try {
      const shopId = await resolveShopId();
      if (!shopId) {
        setSubmitError('Shop is not configured (NEXT_PUBLIC_SHOP_ID).');
        return;
      }

      if (needsName && finalName) {
        await updateProfile({ displayName: finalName });
        await refreshUser({ silent: true });
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
        await checkDeliveryLocation(payload.lat, payload.lng);
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

      setIsDraftDirty(false);
      setShowLeaveModal(false);
      saveCompletedRef.current = true;
      lastSavedAddressIdRef.current = createdId;
      navigateBackWith(createdId);
    } catch (e) {
      setSubmitError(e?.message || 'Could not save. Try again.');
    }
  };

  const submitting = isCreating || isUpdating;

  // ── Loading / auth guard ──
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={32} className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!ok) {
    return (
      <GuestAuthPrompt
        pageTitle={isEdit ? 'Edit address' : 'Add address'}
        backHref={returnTo}
        fallbackHref="/"
        description="Sign in to save a delivery address."
      />
    );
  }

  // Resolved-address preview text (shown on step 1).
  const previewLine1 =
    resolvedAddress?.line1 ||
    [resolvedAddress?.landmark, resolvedAddress?.line2].filter(Boolean).join(', ') ||
    'Pinned location';
  const previewLine2 =
    [resolvedAddress?.city, resolvedAddress?.state, resolvedAddress?.postalCode]
      .filter(Boolean)
      .join(', ') || (resolvingStatus === 'loading' ? 'Resolving address…' : 'Pan the map to refine');

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Step 2 header — back + title (kept compact). Step 1 is fully chromeless;
          its back button floats over the map next to the search bar. */}
      {step === 2 && (
        <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft size={16} className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
              Step 2 of 2
            </p>
            <h1 className="truncate text-base font-semibold text-gray-900">
              Add address details
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
              onAddress={handleMapAddress}
              userLocation={userLocation}
              storeLocation={storeCoords}
              showStoreMarker={false}
              deliveryRadiusM={mapDeliveryRadiusM}
              focusRequest={mapFocusRequest}
            />

            {/* Floating back button — sits to the left of the map's search bar */}
            <button
              type="button"
              onClick={requestLeave}
              aria-label="Back"
              className="absolute left-3 top-3 z-[1100] inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md hover:bg-gray-50"
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
              {pinDeliveryCheck.loading && (
                <p className="mt-1 text-[13px] font-medium">Checking whether we deliver here…</p>
              )}
              {!pinDeliveryCheck.loading && pinDeliveryCheck.error && (
                <p className="mt-1 text-[13px] font-medium">{pinDeliveryCheck.error}</p>
              )}
              {!pinDeliveryCheck.loading && !pinDeliveryCheck.error && pinDeliveryCheck.serviceable === true && (
                <p className="mt-1 text-[14px] font-bold text-violet-900">Delivery available at this spot</p>
              )}
              {!pinDeliveryCheck.loading && !pinDeliveryCheck.error && pinDeliveryCheck.serviceable === false && (
                <p className="mt-1 text-[13px] font-semibold">
                  Delivery not available — move the map so the pin sits inside the green zone.
                </p>
              )}
              {!pinDeliveryCheck.loading && !pinDeliveryCheck.error && pinDeliveryCheck.serviceable == null && (
                <p className="mt-1 text-[13px] font-medium text-gray-600">
                  Pan the map; we’ll check this spot automatically.
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
                  Delivering to
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
                if (isEdit) markDirty();
                if (resolvedAddress) {
                  applyGeocodedAddressToForm(resolvedAddress, { overwriteLine1: true });
                }
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
                      state: String(prev.state || '').trim() ? prev.state : existing.state,
                      postalCode: /^\d{6}$/.test(String(prev.postalCode || '').replace(/\s/g, ''))
                        ? prev.postalCode
                        : existing.postalCode,
                      country: prev.country || existing.country,
                      raw: String(prev.raw || '').trim() ? prev.raw : existing.raw,
                    }));
                  }
                }
                setStep(2);
              }}
              disabled={!coords}
              className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-sm transition active:scale-[0.99] ${
                coords
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-500'
              }`}
            >
              <Check size={16} className="h-4 w-4" />
              Confirm location
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
          {/* Resolved location summary (compact) */}
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Contact
              </p>
              {needsName ? (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-gray-800">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      setSubmitError('');
                      markDirty();
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
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-800">
                    Mobile number <span className="text-red-500">*</span>
                  </label>
                  <IndianPhoneInput
                    value={phoneDraft}
                    onChange={(v) => {
                      setPhoneDraft(v);
                      setSubmitError('');
                      markDirty();
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
                  Building / Apartment No <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.line1}
                  onChange={setField('line1')}
                  placeholder="e.g. Flat 402, Tower B"
                  className={inputCls('line1')}
                />
                {err('line1') && <p className="mt-1 text-xs text-red-600">{err('line1')}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Address line 2 (from map)
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.city}
                    onChange={setField('city')}
                    className={inputCls('city')}
                  />
                  {err('city') && <p className="mt-1 text-xs text-red-600">{err('city')}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.state}
                    onChange={setField('state')}
                    className={inputCls('state')}
                  />
                  {err('state') && <p className="mt-1 text-xs text-red-600">{err('state')}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  PIN code <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.postalCode}
                  onChange={setPostalCode}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  className={inputCls('postalCode')}
                />
                {pinLookupMessage && (
                  <p
                    className={`mt-1 text-[11px] ${
                      pinLookupStatus === 'error'
                        ? 'text-amber-700'
                        : pinLookupStatus === 'success'
                          ? 'text-violet-700'
                          : 'text-gray-500'
                    }`}
                  >
                    {pinLookupMessage}
                  </p>
                )}
                {err('postalCode') && (
                  <p className="mt-1 text-xs text-red-600">{err('postalCode')}</p>
                )}
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
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      )}

      <ConfirmModal
        isOpen={showLeaveModal}
        overlayClassName="z-[250]"
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
