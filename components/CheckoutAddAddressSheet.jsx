'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function CheckoutAddAddressSheet({
  isOpen,
  onClose,
  onCreate,
  isSubmitting = false,
  initialFullName = '',
  initialPhone = '',
}) {
  const emptyForm = (prefillName, prefillPhone) => ({
    label: 'Home',
    fullName: prefillName || '',
    phone: prefillPhone || '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const [form, setForm] = useState({
    label: 'Home',
    fullName: initialFullName,
    phone: initialPhone,
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    // Reset every time the sheet opens so it never copies a selected address
    setForm(emptyForm(initialFullName, initialPhone));
    setTouched({});
  }, [isOpen, initialFullName, initialPhone]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
  }, [isOpen]);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const validate = useMemo(() => {
    const errors = {};

    const fullName = form.fullName.trim();
    const phone = form.phone.replace(/\s+/g, '').trim();
    const street = form.street.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const postalCode = form.postalCode.replace(/\s+/g, '').trim();

    if (!fullName) errors.fullName = 'Full name is required';

    if (!phone) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!street) errors.street = 'Street / house is required';
    if (!city) errors.city = 'City is required';
    if (!state) errors.state = 'State is required';

    if (!postalCode) {
      errors.postalCode = 'Postal code is required';
    } else if (!/^\d{5,8}$/.test(postalCode)) {
      // supports India PIN (6) and other common postal lengths (5-8)
      errors.postalCode = 'Enter a valid postal code';
    }

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }, [form]);

  const canSubmit = validate.isValid && !isSubmitting;

  const fieldError = (key) => (touched[key] ? validate.errors[key] : '');

  const inputClass = (key) => {
    const base =
      'mt-1 w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2';
    if (fieldError(key)) {
      return `${base} border-red-300 focus:ring-red-200`;
    }
    return `${base} border-gray-200 focus:ring-primary/30`;
  };

  const handleSubmit = async () => {
    // Mark all as touched to show all errors if user taps Save early
    setTouched({
      label: true,
      fullName: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
    });
    if (!validate.isValid) return;
    await onCreate({
      label: form.label,
      fullName: form.fullName,
      phone: form.phone,
      street: form.street,
      address: form.street,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      zipCode: form.postalCode,
      country: form.country || 'India',
      isDefault: false,
    });
    // Reset after successful submit (in case user reopens quickly)
    setForm(emptyForm(initialFullName, initialPhone));
    setTouched({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="mx-auto w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 overflow-hidden">
          {/* Drag handle (visual only) */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Add New Address</h3>
                <p className="text-xs text-gray-500 mt-0.5">Save and use it for this order</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Label */}
              <div>
                <label className="text-xs font-semibold text-gray-700">Label</label>
                <select
                  value={form.label}
                  onChange={setField('label')}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Full name</label>
                  <input
                    value={form.fullName}
                    onChange={setField('fullName')}
                    placeholder="Full name"
                    className={inputClass('fullName')}
                  />
                  {fieldError('fullName') ? (
                    <p className="mt-1 text-xs text-red-600">{fieldError('fullName')}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-400">Enter the receiver name</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={setField('phone')}
                    inputMode="tel"
                    placeholder="Phone number"
                    className={inputClass('phone')}
                  />
                  {fieldError('phone') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('phone')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Street / House</label>
                <input
                  value={form.street}
                  onChange={setField('street')}
                  placeholder="House no, street, area"
                  className={inputClass('street')}
                />
                {fieldError('street') && (
                  <p className="mt-1 text-xs text-red-600">{fieldError('street')}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">City</label>
                  <input
                    value={form.city}
                    onChange={setField('city')}
                    placeholder="City"
                    className={inputClass('city')}
                  />
                  {fieldError('city') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('city')}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">State</label>
                  <input
                    value={form.state}
                    onChange={setField('state')}
                    placeholder="State"
                    className={inputClass('state')}
                  />
                  {fieldError('state') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('state')}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Postal code</label>
                  <input
                    value={form.postalCode}
                    onChange={setField('postalCode')}
                    inputMode="numeric"
                    placeholder="PIN"
                    className={inputClass('postalCode')}
                  />
                  {fieldError('postalCode') && (
                    <p className="mt-1 text-xs text-red-600">{fieldError('postalCode')}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Country</label>
                  <input
                    value={form.country}
                    onChange={setField('country')}
                    placeholder="India"
                    className={inputClass('country')}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-800 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-primary text-white py-3.5 rounded-2xl font-extrabold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isSubmitting ? 'Saving…' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

