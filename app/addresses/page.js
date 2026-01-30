'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAddress } from '../../context/AddressContext';
import { useAlert } from '../../context/AlertContext';
import PageTopBar from '../../components/PageTopBar';
import ConfirmModal from '../../components/ConfirmModal';
import { Home, MapPin, ChevronRight, Share2, MoreVertical } from 'lucide-react';

export default function AddressesPage() {
  const {
    addresses = [],
    isLoading,
    setDefaultAddress,
    deleteAddress,
    isSettingDefault: isSettingDefaultAddress,
    isDeleting: isDeletingAddress,
  } = useAddress();
  const { showAlert } = useAlert();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);

  const handleSetDefault = async (id) => {
    setMenuOpenId(null);
    try {
      await setDefaultAddress(id);
      showAlert('Default address updated.', 'Success', 'success');
    } catch (e) {
      showAlert(e?.message || 'Failed to set default.', 'Error', 'error');
    }
  };

  const handleDeleteClick = (address) => {
    setMenuOpenId(null);
    setAddressToDelete(address);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;
    try {
      await deleteAddress(addressToDelete.id);
      showAlert('Address removed.', 'Success', 'success');
      setAddressToDelete(null);
      setShowDeleteConfirm(false);
    } catch (e) {
      showAlert(e?.message || 'Failed to delete.', 'Error', 'error');
    }
  };

  const handleShareAddress = (address) => {
    setMenuOpenId(null);
    const text = [
      address.fullName,
      address.street || address.address,
      [address.city, address.state, address.postalCode || address.zipCode].filter(Boolean).join(', '),
      address.country,
    ].filter(Boolean).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showAlert('Address copied to clipboard.', 'Copied', 'success');
    }
  };

  const formatAddressLine = (address) => {
    const parts = [
      address.street || address.address,
      address.city,
      address.state,
      address.postalCode || address.zipCode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const addressLabel = (addr) => addr.label || addr.addressType || 'Other';
  const isHome = (addr) => (addressLabel(addr) || '').toLowerCase() === 'home';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <PageTopBar title="Addresses" backHref="/settings" fallbackHref="/" />

      <div className="mx-auto max-w-lg px-4 pt-6">
        {/* Add New Address card */}
        <Link
          href="/profile?tab=addresses"
          className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm mb-6 hover:bg-gray-50 transition-colors"
        >
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold leading-none">
            +
          </span>
          <span className="flex-1 text-primary font-semibold text-gray-900">Add New Address</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Saved Addresses heading */}
        <h2 className="text-base font-bold text-gray-900 mb-3 px-1">Saved Addresses</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-500 text-sm">No saved addresses</p>
            <Link href="/profile?tab=addresses" className="inline-block mt-3 text-primary font-medium text-sm">
              Add your first address
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 relative"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    {isHome(address) ? (
                      <Home className="w-5 h-5 text-gray-600" strokeWidth={2} />
                    ) : (
                      <MapPin className="w-5 h-5 text-gray-600" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{addressLabel(address)}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden />
                      <span className="text-xs text-gray-500">—</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formatAddressLine(address)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleShareAddress(address)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      aria-label="Copy address"
                    >
                      <Share2 className="w-5 h-5" strokeWidth={2} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === address.id ? null : address.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        aria-label="More options"
                        aria-expanded={menuOpenId === address.id}
                      >
                        <MoreVertical className="w-5 h-5" strokeWidth={2} />
                      </button>
                      {menuOpenId === address.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            aria-hidden
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] py-1 bg-white rounded-xl border border-gray-200 shadow-lg">
                            {!address.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(address.id)}
                                disabled={isSettingDefaultAddress}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Set as default
                              </button>
                            )}
                            <Link
                              href={`/profile?tab=addresses&edit=${address.id}`}
                              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setMenuOpenId(null)}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(address)}
                              disabled={isDeletingAddress}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
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
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setAddressToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete address"
        message="Are you sure you want to remove this address?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
