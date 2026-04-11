'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '../../components/Container';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useActivityLog } from '../../context/ActivityLogContext';
import { useOrdersList } from '../../hooks/useOrders';
import { useUpdateProfile, useChangePassword } from '../../hooks/useAuth';
import ConfirmModal from '../../components/ConfirmModal';
import PageTopBar from '../../components/PageTopBar';
import {
  Package,
  MapPin,
  Heart,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Pencil,
} from 'lucide-react';

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout, deleteAccount, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { logActivity } = useActivityLog();
  const { data: ordersData } = useOrdersList({ page: 1, per_page: 5 }, { enabled: isAuthenticated });
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const recentOrders = ordersData?.orders || [];

  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true');
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || `User ${user.phone?.slice(-4) || ''}`,
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: profileData.name,
        phone: profileData.phone,
        dateOfBirth: profileData.dateOfBirth || undefined,
        gender: profileData.gender || undefined,
      };
      
      await updateProfileMutation.mutateAsync(updateData);
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

  const confirmLogout = () => {
    logActivity('logout', { userId: user?.phone });
    logout();
    router.push('/');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      showAlert('Please type "DELETE" to confirm', 'Confirmation Required', 'warning');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    logActivity('account_deleted', { userId: user?.phone });
    deleteAccount();
    showAlert('Your account has been deleted.', 'Account Deleted', 'success');
    router.push('/');
  };

  const menuItems = [
    { id: 'orders', label: 'Orders', href: '/orders', Icon: Package },
    { id: 'addresses', label: 'Addresses', href: '/addresses', Icon: MapPin },
    { id: 'wishlist', label: 'Wishlist', href: '/wishlist', Icon: Heart },
    { id: 'privacy', label: 'Privacy & account', href: '/settings', Icon: Shield },
    { id: 'help', label: 'Help & Support', href: '/settings', Icon: HelpCircle },
    { id: 'logout', label: 'Logout', Icon: LogOut, isDanger: true },
  ];

  if (isEditing) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-white">
        <PageTopBar title="Edit Profile" fallbackHref="/profile" />

        <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto overscroll-contain px-4 py-6 pb-10">
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

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">E mail address</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">User name</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value="••••••••••••"
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Phone number</label>
                <div className="flex gap-2">
                  <select className="w-20 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent">
                    <option>+91</option>
                  </select>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
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
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <PageTopBar title="My Profile" fallbackHref="/" />

      <div className="mx-auto max-w-2xl min-h-0 w-full flex-1 overflow-y-auto overscroll-contain pb-8">
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
                <Pencil className="h-4 w-4" strokeWidth={2} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white px-4 py-4 border-b border-gray-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{recentOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Orders</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{wishlistItems.length}</div>
            <p className="text-xs text-gray-600 mt-1">Wishlist</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{cartItems.length}</div>
            <p className="text-xs text-gray-600 mt-1">Cart items</p>
          </div>
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
                    <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" strokeWidth={2} />
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
                  <Icon className="h-5 w-5 flex-shrink-0 text-gray-600" strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" strokeWidth={2} />
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

        {/* Danger Zone */}
        <div className="bg-white mx-4 mt-4 rounded-lg border border-red-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-900 mb-3">Danger Zone</h3>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors text-sm"
          >
            Delete Account
          </button>
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

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="This action cannot be undone. All your data will be permanently deleted."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="h-16 bg-white animate-pulse"></div>
          <div className="bg-white mx-4 mt-4 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}