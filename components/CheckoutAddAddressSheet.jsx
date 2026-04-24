'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateStorefrontProfile, getShopIdFromEnv } from '../utils/authApi';

function addressToForm(addr) {
  if (!addr) {
    return {
      label: 'Home',
      line1: '',
      line2: '',
      landmark: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      lat: null,
      lng: null,
      raw: '',
    };
  }
  const line1 =
    addr.line1 ||
    (typeof addr.street === 'string' && addr.street ? addr.street.split(',')[0]?.trim() : '') ||
    (typeof addr.address === 'string' ? addr.address.split(',')[0]?.trim() : '') ||
    '';
  return {
    label: addr.label || 'Home',
    line1,
    line2: addr.line2 || '',
    landmark: addr.landmark || '',
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postalCode || addr.zipCode || '',
    country: addr.country || 'India',
    lat: addr.lat ?? null,
    lng: addr.lng ?? null,
    raw: addr.raw != null ? String(addr.raw) : '',
  };
}

export default function CheckoutAddAddressSheet({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingAddress = null,
  isSubmitting = false,
  initialFullName = '',
  initialPhone = '',
}) {
  const { user, refreshUser } = useAuth();
  const isEdit = Boolean(editingAddress?.id);

  const nameFromProfile = (user?.name || initialFullName || '').trim();
  const phoneFromProfile = (user?.phone || initialPhone || '').trim();
  const nameFromAddress = (editingAddress?.fullName || '').trim();
  const phoneFromAddress = (editingAddress?.phone || '').trim();

  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [pending, setPending] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle');

  const needsNameField = !nameFromProfile;
  const needsPhoneField = !phoneFromProfile;

  const emptyForm = () => addressToForm(null);
  const [form, setForm] = useState(() => emptyForm());
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError('');
    setTouched({});
    setGeoStatus('idle');
    if (isEdit && editingAddress) {
      setForm(addressToForm(editingAddress));
      setNameDraft(nameFromProfile ? '' : (nameFromAddress || ''));
      setPhoneDraft(phoneFromProfile ? '' : (phoneFromAddress || ''));
    } else {
      setForm(emptyForm());
      setNameDraft('');
      setPhoneDraft('');
    }
  }, [isOpen, isEdit, editingAddress?.id, nameFromProfile, phoneFromProfile, nameFromAddress, phoneFromAddress]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const setField = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const validation = useMemo(() => {
    const errors = {};
    const line1 = form.line1.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const postal = form.postalCode.replace(/\s/g, '').trim();

    if (!line1) errors.line1 = 'Address line 1 is required';
    if (!city) errors.city = 'City is required';
    if (!state) errors.state = 'State is required';
    if (!postal) errors.postalCode = 'PIN code is required';
    else if (!/^\d{6}$/.test(postal)) errors.postalCode = 'Enter a valid 6-digit PIN';

    if (needsNameField) {
      const n = nameDraft.trim() || nameFromAddress;
      if (!n || n.length < 2) errors.name = 'Enter your full name';
    }

    if (needsPhoneField) {
      const p =
        phoneDraft.replace(/\D/g, '').slice(0, 10) || phoneFromAddress.replace(/\D/g, '').slice(0, 10);
      if (!p) errors.phone = 'Enter your 10-digit mobile number';
      else if (!/^\d{10}$/.test(p)) errors.phone = 'Mobile must be 10 digits';
    } else {
      const p = phoneFromProfile.replace(/\D/g, '').slice(0, 10);
      if (p && !/^\d{10}$/.test(p)) errors.phone = 'Update your phone in profile';
    }

    return { errors, ok: Object.keys(errors).length === 0 };
  }, [form, needsNameField, needsPhoneField, nameDraft, phoneDraft, nameFromAddress, phoneFromAddress, phoneFromProfile]);

  const canSubmit = validation.ok && !isSubmitting && !pending;

  const err = (key) => (touched[key] ? validation.errors[key] : '');

  const inputCls = (key) =>
    `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
      err(key) ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-emerald-200'
    }`;

  const buildPayload = (nameResolved, phoneResolved) => ({
    label: form.label,
    line1: form.line1.trim(),
    line2: form.line2.trim(),
    landmark: form.landmark.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.replace(/\s/g, '').trim(),
    country: form.country || 'India',
    lat: form.lat,
    lng: form.lng,
    raw: form.raw.trim() || null,
    street: [form.line1, form.line2].filter(Boolean).join(', '),
    address: form.line1.trim(),
    zipCode: form.postalCode.replace(/\s/g, '').trim(),
    fullName: nameResolved,
    phone: String(phoneResolved || '').replace(/\D/g, '').slice(0, 10),
    isDefault: true,
  });

  const requestGeo = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos?.coords?.latitude ?? null,
          lng: pos?.coords?.longitude ?? null,
        }));
        setGeoStatus('ready');
      },
      (e) => {
        setGeoStatus(e?.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  };

  const ensureCoordinates = async () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable');
      throw new Error('Location is not supported in this browser.');
    }

    setGeoStatus('requesting');
    const coords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos?.coords?.latitude ?? null,
            lng: pos?.coords?.longitude ?? null,
          }),
        (e) => {
          if (e?.code === 1) {
            reject(new Error('Location permission is required to save this address.'));
            return;
          }
          reject(new Error(e?.message || 'Could not fetch your location.'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
      );
    });

    if (!Number.isFinite(Number(coords?.lat)) || !Number.isFinite(Number(coords?.lng))) {
      throw new Error('Could not fetch valid location coordinates.');
    }

    setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    setGeoStatus('ready');
    return coords;
  };

  const handleSubmit = async () => {
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

    const finalName = (needsNameField ? nameDraft.trim() || nameFromAddress : nameFromProfile).trim();
    const finalPhone = (
      needsPhoneField
        ? phoneDraft.replace(/\D/g, '').slice(0, 10) || phoneFromAddress.replace(/\D/g, '').slice(0, 10)
        : phoneFromProfile.replace(/\D/g, '').slice(0, 10)
    );

    if (!getShopIdFromEnv()) {
      setSubmitError('Shop is not configured (NEXT_PUBLIC_SHOP_ID).');
      return;
    }

    setPending(true);
    try {
      const coords = await ensureCoordinates();

      const patch = {};
      if (needsNameField && finalName) patch.displayName = finalName;
      if (needsPhoneField && finalPhone) patch.phone = finalPhone;

      if (Object.keys(patch).length > 0) {
        await updateStorefrontProfile(patch);
        await refreshUser();
      }

      const payload = {
        ...buildPayload(finalName, finalPhone),
        lat: coords.lat,
        lng: coords.lng,
      };

      if (isEdit && editingAddress?.id && typeof onUpdate === 'function') {
        await onUpdate(editingAddress.id, payload);
      } else {
        await onCreate(payload);
      }
      setForm(emptyForm());
      setNameDraft('');
      setPhoneDraft('');
      setTouched({});
    } catch (e) {
      setSubmitError(e?.message || 'Could not save. Try again.');
    } finally {
      setPending(false);
    }
  };

  if (!isOpen) return null;

  const busy = isSubmitting || pending;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-0 sm:p-4 sm:pb-6">
        <div
          className="pointer-events-auto flex max-h-[min(92dvh,100dvh)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-3 sm:px-5">
            <div className="min-w-0 pt-1">
              <h3 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Edit address' : 'Add delivery address'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {isEdit ? 'Update where we deliver your order.' : 'One saved address per account.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                {geoStatus === 'denied'
                  ? 'Location denied. You can still enter your address manually.'
                  : 'Location unavailable. Enter your address manually.'}
              </div>
            )}

            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Contact</p>
              <p className="mt-1 text-[11px] text-gray-500">
                We use your profile when possible. Add missing details below — they are saved to your account.
              </p>

              {needsNameField ? (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-800">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      setSubmitError('');
                    }}
                    autoComplete="name"
                    placeholder="Name as on ID / phone bill"
                    className={inputCls('name')}
                  />
                  {err('name') && <p className="mt-1 text-xs text-red-600">{err('name')}</p>}
                </div>
              ) : (
                <p className="mt-2 text-sm font-medium text-gray-900">{nameFromProfile}</p>
              )}

              {needsPhoneField ? (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-800">
                    Mobile number <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={phoneDraft}
                    onChange={(e) => {
                      setPhoneDraft(e.target.value);
                      setSubmitError('');
                    }}
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit mobile"
                    className={inputCls('phone')}
                  />
                  {err('phone') && <p className="mt-1 text-xs text-red-600">{err('phone')}</p>}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-800">{phoneFromProfile}</p>
              )}

              {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={requestGeo}
                disabled={geoStatus === 'requesting'}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {geoStatus === 'requesting' ? 'Getting location…' : 'Use my location'}
              </button>
              {geoStatus === 'ready' && form.lat != null && (
                <span className="text-[11px] text-emerald-700">Location captured</span>
              )}
            </div>

            <div className="space-y-3 pb-2">
              <div>
                <label className="text-xs font-semibold text-gray-700">Label</label>
                <select
                  value={form.label}
                  onChange={setField('label')}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
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
                  value={form.line1}
                  onChange={setField('line1')}
                  placeholder="Flat, house, building, street"
                  className={inputCls('line1')}
                />
                {err('line1') && <p className="mt-1 text-xs text-red-600">{err('line1')}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Address line 2</label>
                <input
                  value={form.line2}
                  onChange={setField('line2')}
                  placeholder="Area, colony (optional)"
                  className={inputCls('line2')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Landmark</label>
                <input
                  value={form.landmark}
                  onChange={setField('landmark')}
                  placeholder="Nearby landmark (optional)"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    PIN code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.postalCode}
                    onChange={setField('postalCode')}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit PIN"
                    className={inputCls('postalCode')}
                  />
                  {err('postalCode') && <p className="mt-1 text-xs text-red-600">{err('postalCode')}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Country</label>
                  <input
                    value={form.country}
                    onChange={setField('country')}
                    className={inputCls('country')}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Delivery notes</label>
                <textarea
                  value={form.raw}
                  onChange={setField('raw')}
                  rows={2}
                  placeholder="Gate code, floor, etc. (optional)"
                  className={`${inputCls('raw')} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Fixed footer — always visible */}
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_14px_rgba(0,0,0,0.06)] sm:px-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[3rem] flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="min-h-[3rem] flex-[1.2] rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save address'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
