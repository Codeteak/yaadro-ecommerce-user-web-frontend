'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useAddress } from '../../context/AddressContext';
import { useAlert } from '../../context/AlertContext';
import PageTopBar from '../../components/PageTopBar';
import {
  ChevronRight,
  User,
  ShoppingBag,
  MessageCircle,
  Heart,
  Wallet,
  RotateCcw,
  Gift,
  MapPin,
  CreditCard,
  Star,
  Bell,
  Info,
} from 'lucide-react';

function profileDisplayName(user) {
  if (!user || typeof user !== 'object') return 'User';
  const candidates = [user.name, user.displayName, user.fullName].filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  );
  if (candidates.length) return candidates[0].trim();
  if (user.email && typeof user.email === 'string') return user.email.split('@')[0];
  return 'User';
}

function profileDisplayPhone(user) {
  if (!user || typeof user !== 'object') return '';
  const candidates = [user.phone, user.mobile, user.phoneNumber].filter(
    (v) => v != null && String(v).replace(/\s/g, '').length > 0
  );
  if (!candidates.length) return '';
  const p = String(candidates[0]).replace(/\s/g, '').trim();
  return p;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, authHydrated, isLoadingUser, logout, refreshUser } = useAuth();
  const { addresses = [] } = useAddress();
  const { showAlert } = useAlert();

  const addressCount = addresses?.length ?? 0;

  const handleLogout = () => {
    logout();
    showAlert('You have been logged out.', 'Logged out', 'success');
    router.push('/');
  };

  useEffect(() => {
    if (!authHydrated) return;
    if (isLoadingUser) return;
    if (!isAuthenticated) router.replace('/');
  }, [authHydrated, isLoadingUser, isAuthenticated, router]);

  /** Load latest profile from GET /api/me/profile (silent — avoid blanking the whole page). */
  useEffect(() => {
    if (!authHydrated || !isAuthenticated || isLoadingUser) return;
    refreshUser({ silent: true });
  }, [authHydrated, isAuthenticated, isLoadingUser, refreshUser]);

  if (!authHydrated || isLoadingUser) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <PageTopBar title="Settings" backHref="/" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const displayName = profileDisplayName(user);
  const phoneText = profileDisplayPhone(user);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <PageTopBar title="Settings" backHref="/" />

      <div className="mx-auto max-w-lg px-4 pt-6">
        {/* User profile section */}
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm mb-6">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{displayName}</h2>
            <p className="text-sm text-gray-600 truncate">
              {phoneText ? (
                <span>{phoneText}</span>
              ) : user?.email ? (
                <span className="text-gray-500">{user.email}</span>
              ) : (
                <span className="text-gray-400">Add name and phone in Profile</span>
              )}
            </p>
            {phoneText && user?.email && (
              <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p>
            )}
          </div>
        </div>

        {/* Quick access tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link
            href="/orders"
            className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="w-7 h-7 text-gray-600" strokeWidth={2} />
            <span className="text-xs font-semibold text-gray-800 text-center">Your Orders</span>
          </Link>
          <Link
            href="#"
            className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-7 h-7 text-gray-600" strokeWidth={2} />
            <span className="text-xs font-semibold text-gray-800 text-center">Help & Support</span>
          </Link>
          <Link
            href="/wishlist"
            className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Heart className="w-7 h-7 text-gray-600" strokeWidth={2} />
            <span className="text-xs font-semibold text-gray-800 text-center">Your Wishlist</span>
          </Link>
        </div>

        {/* Wallet & Gift Card card */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">Wallet & Gift Card</h3>
                <span className="px-2 py-0.5 rounded-md bg-green-500 text-white text-[10px] font-bold uppercase">New</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Available Balance</p>
              <p className="text-xl font-bold text-gray-900">₹0</p>
            </div>
            <button type="button" className="flex-shrink-0 px-3 py-1.5 rounded-lg border-2 border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition-colors">
              Add Balance
            </button>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {/* Your Information section */}
        <h3 className="text-sm font-bold text-gray-900 mb-2 px-1">Your Information</h3>
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
          <Link href="/orders" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <RotateCcw className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Your Refunds</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <Heart className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Your Wishlist</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <Gift className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">E-Gift Cards</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <MessageCircle className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Help & Support</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/addresses" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <MapPin className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 block">Saved Addresses</span>
              <span className="text-xs text-gray-500">{addressCount} {addressCount === 1 ? 'Address' : 'Addresses'}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <User className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Profile</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <Gift className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Rewards</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Other Information section */}
        <h3 className="text-sm font-bold text-gray-900 mb-2 px-1">Other Information</h3>
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <Star className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Suggest Products</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Notifications</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <Info className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">General Info</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Payment Management - optional row in first card or separate; from second image */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
          <Link href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <CreditCard className="w-5 h-5 text-gray-500" strokeWidth={2} />
            <span className="flex-1 text-sm font-medium text-gray-800">Payment Management</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Log Out button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-800 font-semibold text-sm shadow-sm hover:bg-gray-50 transition-colors"
        >
          Log Out
        </button>

        {/* App version */}
        <p className="text-center text-xs text-gray-400 mt-6">App version 1.0.0</p>
      </div>
    </div>
  );
}
