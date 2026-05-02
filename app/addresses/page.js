'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import PageTopBar from '../../components/PageTopBar';
import ConfirmModal from '../../components/ConfirmModal';
import CheckoutAddAddressSheet from '../../components/CheckoutAddAddressSheet';
import {
  Home,
  MapPin,
  ChevronRight,
  Share2,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  BadgeCheck,
} from 'lucide-react';

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated, authHydrated, isLoadingUser, user } = useAuth();
  const {
    addresses = [],
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    isCreating,
    isUpdating,
    isDeleting,
    isSettingDefault,
  } = useAddress();
  const { showAlert } = useAlert();

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!authHydrated) return;
    if (isLoadingUser) return;
    if (!isAuthenticated) router.replace('/');
  }, [authHydrated, isLoadingUser, isAuthenticated, router]);

  const handleShareAddress = (address) => {
    setMenuOpenId(null);
    const streetLine =
      [address.line1, address.line2].filter(Boolean).join(', ') ||
      address.street ||
      address.address;
    const text = [
      address.fullName || user?.name,
      streetLine,
      address.landmark,
      [address.city, address.state, address.postalCode || address.zipCode].filter(Boolean).join(', '),
      address.country,
    ]
      .filter(Boolean)
      .join('\n');
    const phoneLine = address.phone || user?.phone;
    const textWithPhone = phoneLine ? `${text}\n${phoneLine}` : text;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textWithPhone);
      showAlert('Address copied to clipboard.', 'Copied', 'success');
    }
  };

  const formatAddressLine = (address) => {
    const streetLine =
      [address.line1, address.line2].filter(Boolean).join(', ') ||
      address.street ||
      address.address;
    const parts = [
      streetLine,
      address.landmark,
      address.city,
      address.state,
      address.postalCode || address.zipCode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const addressLabel = (addr) => addr.label || addr.addressType || 'Address';
  const isHome = (addr) => (addressLabel(addr) || '').toLowerCase() === 'home';

  const openCreate = () => {
    if (addresses.length >= 1) {
      openEdit(addresses[0]);
      return;
    }
    setEditingAddress(null);
    setSheetOpen(true);
  };

  const openEdit = (addr) => {
    setEditingAddress(addr);
    setSheetOpen(true);
    setMenuOpenId(null);
  };

  const handleSheetCreate = async (data) => {
    await addAddress(data);
    setSheetOpen(false);
    showAlert('Address saved.', 'Success', 'success');
  };

  const handleSheetUpdate = async (id, data) => {
    await updateAddress(id, data);
    setSheetOpen(false);
    setEditingAddress(null);
    showAlert('Address updated.', 'Success', 'success');
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteAddress(deleteTarget.id);
      showAlert('Address removed.', 'Success', 'success');
    } catch (e) {
      showAlert(
        e?.message || 'Could not remove this address. It may not be supported for your account.',
        'Cannot delete',
        'warning'
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSetDefault = async (id) => {
    setMenuOpenId(null);
    try {
      await setDefaultAddress(id);
      showAlert('Default address updated.', 'Success', 'success');
    } catch (e) {
      showAlert(e?.message || 'Could not update default.', 'Error', 'error');
    }
  };

  if (!authHydrated || isLoadingUser) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
        <PageTopBar title="Addresses" backHref="/profile" fallbackHref="/" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <PageTopBar title="Addresses" backHref="/profile" fallbackHref="/" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-6 md:pb-10">
        <div className="mx-auto max-w-lg">
          {/* One address per account (storefront API) — only show add when none saved */}
          {addresses.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="flex-1 font-semibold text-gray-900">Add delivery address</span>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
            </button>
          )}

          <h2 className="mb-3 px-1 text-base font-bold text-gray-900">Saved addresses</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm text-gray-500">No saved addresses yet</p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Add address
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      {isHome(address) ? (
                        <Home className="h-5 w-5 text-gray-600" strokeWidth={2} />
                      ) : (
                        <MapPin className="h-5 w-5 text-gray-600" strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{addressLabel(address)}</span>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                            Default
                          </span>
                        )}
                      </div>
                      {(address.fullName || user?.name) && (
                        <p className="mt-0.5 text-sm font-medium text-gray-800">
                          {address.fullName || user?.name}
                        </p>
                      )}
                      <p className="mt-1 line-clamp-3 text-sm text-gray-600">{formatAddressLine(address)}</p>
                      {(address.phone || user?.phone) && (
                        <p className="mt-1 text-xs text-gray-500">{address.phone || user?.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleShareAddress(address)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Copy address"
                      >
                        <Share2 className="h-5 w-5" strokeWidth={2} />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId(menuOpenId === address.id ? null : address.id)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          aria-label="More options"
                          aria-expanded={menuOpenId === address.id}
                        >
                          <MoreVertical className="h-5 w-5" strokeWidth={2} />
                        </button>
                        {menuOpenId === address.id && (
                          <>
                            <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => openEdit(address)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => handleSetDefault(address.id)}
                                  disabled={isSettingDefault}
                                >
                                  <BadgeCheck className="h-4 w-4" />
                                  Set as default
                                </button>
                              )}
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setDeleteTarget(address);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-gray-400">
            <Link href="/profile" className="text-primary font-medium">
              Back to profile
            </Link>
          </p>
        </div>
      </div>

      <CheckoutAddAddressSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingAddress(null);
        }}
        onCreate={handleSheetCreate}
        onUpdate={handleSheetUpdate}
        editingAddress={editingAddress}
        isSubmitting={isCreating || isUpdating}
        initialFullName={user?.name || ''}
        initialPhone={user?.phone || ''}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove address?"
        message="This will remove the address from your account if your shop supports it."
        confirmText={isDeleting ? 'Removing…' : 'Remove'}
        cancelText="Cancel"
        isDanger
      />
    </div>
  );
}
