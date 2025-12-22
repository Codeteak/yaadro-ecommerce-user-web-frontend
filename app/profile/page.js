'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Container from '../../components/Container';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useActivityLog } from '../../context/ActivityLogContext';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addresses, addAddress, deleteAddress, setDefaultAddress } = useAddress();
  const { user, logout, deleteAccount } = useAuth();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { activities, logActivity, clearActivityLog } = useActivityLog();
  const [activeTab, setActiveTab] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || `User ${user.phone?.slice(-4) || ''}`,
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const [newAddress, setNewAddress] = useState({
    name: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  });

  const orders = []; // Empty for now

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    shareDataWithPartners: false,
    allowPersonalizedAds: false,
    sharePurchaseHistory: false,
    allowEmailMarketing: true,
    allowSMSMarketing: false,
  });

  // Load privacy settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('privacySettings');
      if (saved) {
        try {
          setPrivacySettings(JSON.parse(saved));
        } catch (error) {
          console.error('Error parsing privacy settings:', error);
        }
      }
    }
  }, []);

  // Save privacy settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('privacySettings', JSON.stringify(privacySettings));
    }
  }, [privacySettings]);

  // Set active tab from URL parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['account', 'addresses', 'orders', 'settings', 'privacy'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Format activity timestamp
  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get activity icon
  const getActivityIcon = (action) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      account_created: '✨',
      account_deleted: '🗑️',
      data_exported: '📥',
      privacy_setting_changed: '🔒',
      product_viewed: '👁️',
      cart_updated: '🛒',
      order_placed: '📦',
      address_added: '📍',
      default: '📝',
    };
    return icons[action] || icons.default;
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setIsEditing(false);
    // Here you would typically save to backend
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    addAddress(newAddress);
    setNewAddress({
      name: '',
      fullName: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: false,
    });
    setAddressFormOpen(false);
  };

  const handleDeleteAddress = (id) => {
    deleteAddress(id);
  };

  const handleSetDefault = (id) => {
    setDefaultAddress(id);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logActivity('logout', { userId: user?.phone });
      logout();
      router.push('/');
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      alert('Please type "DELETE" to confirm account deletion');
      return;
    }

    if (window.confirm('This action cannot be undone. Are you absolutely sure you want to delete your account?')) {
      logActivity('account_deleted', { userId: user?.phone, timestamp: new Date().toISOString() });
      deleteAccount();
      router.push('/');
      alert('Your account has been permanently deleted.');
    }
  };

  const handleExportData = () => {
    const userData = {
      user: {
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        createdAt: user?.createdAt || 'N/A',
      },
      addresses: addresses,
      cart: cartItems,
      wishlist: wishlistItems,
      activityLog: activities,
      privacySettings: privacySettings,
      exportDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yaadro-user-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity('data_exported', { userId: user?.phone });
    alert('Your data has been downloaded successfully!');
  };

  const handlePrivacySettingChange = (key, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value,
    }));
    logActivity('privacy_setting_changed', { setting: key, value, userId: user?.phone });
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'addresses', label: 'Addresses', icon: '📍' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
      <Container>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Profile', href: '/profile' }]} />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          Profile
        </h1>

        <div className="px-4 md:px-0">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-2xl md:text-3xl font-bold">
                  {profileData.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{profileData.name}</h2>
              <p className="text-gray-500 text-sm md:text-base mt-1">
                {profileData.email || profileData.phone || 'No contact information'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <div className="flex md:flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm md:text-base font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 md:p-6">
              {/* Account Tab */}
              {activeTab === 'account' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Account Information</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Full Name</span>
                        <p className="text-gray-800 font-medium">{profileData.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Email</span>
                        <p className="text-gray-800 font-medium">{profileData.email}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Phone</span>
                        <p className="text-gray-800 font-medium">{profileData.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Saved Addresses</h3>
                    <button
                      onClick={() => setAddressFormOpen(!addressFormOpen)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm md:text-base font-medium hover:bg-blue-700 transition-colors"
                    >
                      {addressFormOpen ? 'Cancel' : '+ Add New Address'}
                    </button>
                  </div>

                  {addressFormOpen && (
                    <form onSubmit={handleAddAddress} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Label (e.g., Home, Office)</label>
                        <input
                          type="text"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Home"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={newAddress.fullName}
                          onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={newAddress.address}
                          onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={newAddress.postalCode}
                          onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="default"
                          checked={newAddress.isDefault}
                          onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="default" className="text-sm text-gray-700">Set as default address</label>
                      </div>
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Save Address
                      </button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {addresses.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No saved addresses</p>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{address.name}</h4>
                                {address.isDefault && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {address.fullName} • {address.phone}
                              </p>
                              <p className="text-sm text-gray-700 mt-1">
                                {address.address}, {address.city}, {address.state} {address.postalCode}, {address.country}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {!address.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(address.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAddress(address.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Order History</h3>
                    <Link
                      href="/orders"
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base transition-colors"
                    >
                      View All Orders →
                    </Link>
                  </div>
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">View and manage all your orders</p>
                    <Link
                      href="/orders"
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Go to Orders
                    </Link>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-6">Privacy & Data</h3>

                  {/* Privacy Settings */}
                  <div className="space-y-6 mb-8">
                    <div>
                      <h4 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Data Sharing Preferences</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">Share data with partners</p>
                            <p className="text-sm text-gray-500">Allow us to share your data with trusted partners for better service</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={privacySettings.shareDataWithPartners}
                              onChange={(e) => handlePrivacySettingChange('shareDataWithPartners', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">Personalized advertisements</p>
                            <p className="text-sm text-gray-500">Show you personalized ads based on your interests</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={privacySettings.allowPersonalizedAds}
                              onChange={(e) => handlePrivacySettingChange('allowPersonalizedAds', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">Share purchase history</p>
                            <p className="text-sm text-gray-500">Allow sharing of purchase history for recommendations</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={privacySettings.sharePurchaseHistory}
                              onChange={(e) => handlePrivacySettingChange('sharePurchaseHistory', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">Email marketing</p>
                            <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={privacySettings.allowEmailMarketing}
                              onChange={(e) => handlePrivacySettingChange('allowEmailMarketing', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">SMS marketing</p>
                            <p className="text-sm text-gray-500">Receive promotional SMS and updates</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={privacySettings.allowSMSMarketing}
                              onChange={(e) => handlePrivacySettingChange('allowSMSMarketing', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Export */}
                  <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-base md:text-lg font-semibold text-gray-800 mb-2">Export Your Data</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Download all your data including profile, addresses, cart, wishlist, and activity log in JSON format (GDPR compliant).
                    </p>
                    <button
                      onClick={handleExportData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Data
                    </button>
                  </div>

                  {/* Activity Log */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base md:text-lg font-semibold text-gray-800">Activity Log</h4>
                      {activities.length > 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to clear your activity log?')) {
                              clearActivityLog();
                              logActivity('activity_log_cleared', { userId: user?.phone });
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                        >
                          Clear Log
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {activities.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No activities recorded yet</p>
                      ) : (
                        activities.slice(0, 50).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-2xl">{getActivityIcon(activity.action)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 capitalize">
                                {activity.action.replace(/_/g, ' ')}
                              </p>
                              {activity.details && Object.keys(activity.details).length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {Object.entries(activity.details)
                                    .filter(([key]) => key !== 'userId')
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ')}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{formatActivityTime(activity.timestamp)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Account Deletion */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="text-base md:text-lg font-semibold text-red-800 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-red-800 mb-2">
                            Type <strong>"DELETE"</strong> to confirm:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Confirm Deletion
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-800">Notifications</p>
                        <p className="text-sm text-gray-500">Email and push notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-800">Newsletter</p>
                        <p className="text-sm text-gray-500">Receive updates and offers</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="pt-4 space-y-3">
                      <button
                        onClick={handleLogout}
                        className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                      <div className="pt-2">
                        <p className="text-sm text-gray-500 mb-2">
                          For account deletion and privacy settings, please visit the <button onClick={() => setActiveTab('privacy')} className="text-blue-600 hover:text-blue-800 font-medium">Privacy tab</button>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

