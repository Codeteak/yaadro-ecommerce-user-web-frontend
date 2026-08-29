'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useCart } from '../../context/CartContext';
import { useActivityLog } from '../../context/ActivityLogContext';
import { useOrdersList } from '../../hooks/useOrders';
import { useUpdateProfile } from '../../hooks/useAuth';
import ConfirmModal from '../../components/ConfirmModal';
import PhoneChangeOtpSheet from '../../components/PhoneChangeOtpSheet';
import PageTopBar from '../../components/PageTopBar';
import ProfileOffersSection from '../../components/profile/ProfileOffersSection';
import ProfileCouponsSection from '../../components/profile/ProfileCouponsSection';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import {
  ExitRegular as LogOut,
  MapPinRegular as MapPin,
  PackageRegular as Package,
  PencilRegular as Pencil,
  RightRegular as ChevronRight,
} from '../../components/icons';

import { normalizePhoneForApi } from '../../utils/otpVerifyPayload';
import {
  firstZodIssueMessage,
  profileUpdateSchema,
} from '../../lib/validations/auth.schema';
import ProfilePageSkeleton from '../../components/skeletons/ProfilePageSkeleton';
import GuestAuthPrompt from '../../components/GuestAuthPrompt';

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ok, ready } = useRequireAuth();
  const { user, logout, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const { cartItems } = useCart();
  const { logActivity } = useActivityLog();
  const { data: ordersData } = useOrdersList({ limit: 5 }, { enabled: ok });
  const updateProfileMutation = useUpdateProfile();
  const recentOrders = ordersData?.orders || [];

  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true');
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: normalizePhoneForApi(user?.phone || ''),
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPhoneChange, setShowPhoneChange] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || `User ${normalizePhoneForApi(user.phone || '').slice(-4) || ''}`,
        email: user.email || '',
        phone: normalizePhoneForApi(user.phone || ''),
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const result = profileUpdateSchema.safeParse({
      name: profileData.name,
      dateOfBirth: profileData.dateOfBirth || undefined,
      gender: profileData.gender || undefined,
    });
    if (!result.success) {
      showAlert(firstZodIssueMessage(result), 'Invalid profile', 'warning');
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        name: result.data.name,
      });
      await refreshUser();
      setIsEditing(false);
      showAlert('Profile updated successfully!', 'Success', 'success');
      router.push('/profile');
    } catch (error) {
      showAlert(error.message || 'Failed to update profile.', 'Error', 'error');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    logActivity('logout', { userId: user?.phone });
    await logout();
    router.push('/');
  };

  const menuItems = [
    { id: 'orders', label: 'Orders', href: '/orders', Icon: Package },
    { id: 'addresses', label: 'Addresses', href: '/addresses', Icon: MapPin },
    { id: 'logout', label: 'Logout', Icon: LogOut, isDanger: true },
  ];

  if (!ready) {
    return <ProfilePageSkeleton />;
  }

  if (!ok) {
    return (
      <GuestAuthPrompt
        pageTitle="My Profile"
        fallbackHref="/"
        description="Sign in to view and edit your profile."
      />
    );
  }

  if (isEditing) {
    return (
      <>
      <div className="flex min-h-screen flex-col bg-white">
        <div className="sticky top-0 z-20 shrink-0 bg-white">
          <PageTopBar title="Edit Profile" fallbackHref="/profile" />
        </div>

        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24">
          <form onSubmit={handleProfileUpdate} className="space-y-5">
            {/* Profile Picture Section */}
            <div className="text-center mb-6">
              <div className="w-28 h-28 mx-auto mb-4 relative">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center overflow-hidden border-4 border-gray-100">
                  <span className="text-white text-5xl font-bold">
                    {profileData.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-white border-2 border-gray-200 rounded-full p-2 hover:bg-gray-50 transition-colors"
                  title="Change photo"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              {(profileData.email || '').trim() !== '' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Email address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Phone number</label>
                <p className="text-sm text-gray-800">
                  {profileData.phone ? `+91 ${profileData.phone}` : 'Not set'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPhoneChange(true)}
                  className="mt-2 text-sm font-semibold text-violet-700"
                >
                  Change phone
                </button>
                <p className="mt-1 text-xs text-gray-500">Changing phone requires an OTP and refreshes your session.</p>
              </div>

              {profileData.dateOfBirth && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      <PhoneChangeOtpSheet
        isOpen={showPhoneChange}
        onClose={() => setShowPhoneChange(false)}
        currentPhone={profileData.phone}
        onSuccess={() => {
          showAlert('Phone number updated.', 'Success', 'success');
        }}
      />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBar title="My Profile" fallbackHref="/" />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 pb-24">
        {/* Profile Header */}
        <div className="bg-white px-4 py-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                <span className="text-white text-3xl font-bold">
                  {profileData.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-white"></span>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{profileData.name}</h2>
              <p className="text-sm text-gray-600">@{profileData.phone?.slice(-6) || 'user'}</p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Pencil size={16} className="h-4 w-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white px-4 py-4 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{recentOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Orders</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{cartItems.length}</div>
            <p className="text-xs text-gray-600 mt-1">Cart items</p>
          </div>
        </div>

        {/* Category offers */}
        <div className="mx-4 mt-4 rounded-lg border border-gray-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Category offers</h3>
          <ProfileOffersSection />
        </div>

        {/* Coupons */}
        <div className="mx-4 mt-4 rounded-lg border border-gray-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Available coupons</h3>
          <ProfileCouponsSection />
        </div>

        {/* Menu Items */}
        <div className="mx-4 mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
          {menuItems.map((item) => {
            const Icon = item.Icon;
            if (item.id === 'logout') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between px-4 py-4 text-left text-red-600 transition-colors hover:bg-red-50"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight size={20} className="h-5 w-5 flex-shrink-0 text-gray-400" />
                </button>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between px-4 py-4 text-gray-700 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="h-5 w-5 flex-shrink-0 text-gray-600" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight size={20} className="h-5 w-5 flex-shrink-0 text-gray-400" />
              </Link>
            );
          })}
        </div>

        {/* Account Info */}
        <div className="bg-white mx-4 mt-4 rounded-lg border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="text-gray-500">Email:</span> {profileData.email}
            </p>
            <p className="text-gray-600">
              <span className="text-gray-500">Phone:</span> {profileData.phone}
            </p>
            {profileData.dateOfBirth && (
              <p className="text-gray-600">
                <span className="text-gray-500">DOB:</span> {new Date(profileData.dateOfBirth).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />

      <PhoneChangeOtpSheet
        isOpen={showPhoneChange}
        onClose={() => setShowPhoneChange(false)}
        currentPhone={profileData.phone}
        onSuccess={() => {
          showAlert('Phone number updated.', 'Success', 'success');
        }}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  );
}