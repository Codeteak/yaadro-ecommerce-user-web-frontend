'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '../../components/Container';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useActivityLog } from '../../context/ActivityLogContext';
import { useOrdersList } from '../../hooks/useOrders';
import { useUpdateProfile, useChangePassword } from '../../hooks/useAuth';
import Breadcrumbs from '../../components/Breadcrumbs';
import ConfirmModal from '../../components/ConfirmModal';
import PageTopBar from '../../components/PageTopBar';

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { 
    addresses, 
    addAddress, 
    deleteAddress, 
    setDefaultAddress,
    isLoading: isLoadingAddresses,
    isCreating: isCreatingAddress,
    isDeleting: isDeletingAddress,
    isSettingDefault: isSettingDefaultAddress,
  } = useAddress();
  const { user, logout, deleteAccount, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const { cartItems } = useCart();
  const { wishlistItems } = useWishlist();
  const { activities, logActivity, clearActivityLog } = useActivityLog();
  const { data: ordersData } = useOrdersList({ page: 1, per_page: 5 });
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const recentOrders = ordersData?.orders || [];
  const [activeTab, setActiveTab] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAddressConfirm, setShowDeleteAddressConfirm] = useState(null);
  const [showClearActivityConfirm, setShowClearActivityConfirm] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile data when user changes
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

  const [newAddress, setNewAddress] = useState({
    name: '',
    label: '',
    fullName: '',
    phone: '',
    address: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    zipCode: '',
    country: 'India',
    landmark: '',
    isDefault: false,
  });


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
      // Refresh user data in context
      await refreshUser();
      setIsEditing(false);
      showAlert('Profile updated successfully!', 'Success', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to update profile. Please try again.', 'Error', 'error');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert('New passwords do not match', 'Validation Error', 'warning');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showAlert('Password must be at least 8 characters long', 'Validation Error', 'warning');
      return;
    }

    try {
      const passwordUpdateData = {
        newPassword: passwordData.newPassword,
      };
      
      // Only include currentPassword if user has one (not OTP-based registration)
      if (passwordData.currentPassword) {
        passwordUpdateData.currentPassword = passwordData.currentPassword;
      }
      
      await changePasswordMutation.mutateAsync(passwordUpdateData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      showAlert('Password updated successfully!', 'Success', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to change password. Please try again.', 'Error', 'error');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress({
        label: newAddress.name || newAddress.label,
        fullName: newAddress.fullName,
        phone: newAddress.phone,
        street: newAddress.street || newAddress.address,
        address: newAddress.street || newAddress.address,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode || newAddress.zipCode,
        zipCode: newAddress.postalCode || newAddress.zipCode,
        country: newAddress.country,
        landmark: newAddress.landmark || undefined,
        isDefault: newAddress.isDefault,
      });
      setNewAddress({
        name: '',
        label: '',
        fullName: '',
        phone: '',
        address: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        zipCode: '',
        country: 'India',
        landmark: '',
        isDefault: false,
      });
      setAddressFormOpen(false);
      showAlert('Address added successfully!', 'Success', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to add address. Please try again.', 'Error', 'error');
    }
  };

  const handleDeleteAddress = (id) => {
    setShowDeleteAddressConfirm(id);
  };

  const confirmDeleteAddress = async () => {
    try {
      await deleteAddress(showDeleteAddressConfirm);
      showAlert('Address deleted successfully!', 'Success', 'success');
      setShowDeleteAddressConfirm(null);
    } catch (error) {
      showAlert(error.message || 'Failed to delete address. Please try again.', 'Error', 'error');
      setShowDeleteAddressConfirm(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      showAlert('Default address updated successfully!', 'Success', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to set default address. Please try again.', 'Error', 'error');
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
      showAlert('Please type "DELETE" to confirm account deletion', 'Confirmation Required', 'warning');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    logActivity('account_deleted', { userId: user?.phone, timestamp: new Date().toISOString() });
    deleteAccount();
    showAlert('Your account has been permanently deleted.', 'Account Deleted', 'success');
    router.push('/');
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
    showAlert('Your data has been downloaded successfully!', 'Success', 'success');
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
    <div className="pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
      <PageTopBar title="Profile" fallbackHref="/" />
      <Container>
        <div className="hidden md:block">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Profile', href: '/profile' }]} />
        </div>
        <h1 className="hidden md:block text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          Profile
        </h1>

        <div className="px-4 md:px-0">
          {/* Profile Header with Stats */}
          <div className="bg-gradient-to-br from-primary/10 to-green-50 rounded-xl shadow-lg p-6 md:p-8 mb-6 border border-primary/20">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-24 h-24 md:w-28 md:h-28 bg-primary rounded-full flex items-center justify-center shadow-lg ring-4 ring-primary/20">
                <span className="text-white text-3xl md:text-4xl font-bold">
                  {profileData.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{profileData.name}</h2>
                <p className="text-gray-600 text-base mb-4">
                  {profileData.email || profileData.phone || 'No contact information'}
                </p>
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                    <div className="text-2xl font-bold text-primary-dark">{cartItems.length}</div>
                    <div className="text-xs text-gray-600 mt-1">Cart Items</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                    <div className="text-2xl font-bold text-primary-dark">{wishlistItems.length}</div>
                    <div className="text-xs text-gray-600 mt-1">Wishlist</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
                    <div className="text-2xl font-bold text-primary-dark">{recentOrders.length}</div>
                    <div className="text-xs text-gray-600 mt-1">Recent Orders</div>
                  </div>
                </div>
              </div>
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
                        ? 'text-primary border-b-2 border-primary bg-primary/10'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                        className="text-primary hover:text-primary-dark font-medium text-sm md:text-base transition-colors"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
                          disabled
                          title="Email cannot be changed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={profileData.dateOfBirth}
                            onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                          <select
                            value={profileData.gender}
                            onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                      {profileData.dateOfBirth && (
                        <div>
                          <span className="text-sm text-gray-500">Date of Birth</span>
                          <p className="text-gray-800 font-medium">
                            {new Date(profileData.dateOfBirth).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {profileData.gender && (
                        <div>
                          <span className="text-sm text-gray-500">Gender</span>
                          <p className="text-gray-800 font-medium capitalize">{profileData.gender}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Password Change Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-base font-semibold text-gray-800">Password</h4>
                        <p className="text-sm text-gray-500">Change your password to keep your account secure</p>
                      </div>
                      {!showPasswordForm && (
                        <button
                          onClick={() => setShowPasswordForm(true)}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                          Change Password
                        </button>
                      )}
                    </div>

                    {showPasswordForm && (
                      <form onSubmit={handlePasswordChange} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        {user?.password && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Enter current password"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter new password (min 8 characters)"
                            required
                            minLength={8}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Password must be at least 8 characters with uppercase, lowercase, and number
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                          >
                            {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Saved Addresses</h3>
                    <button
                      onClick={() => setAddressFormOpen(!addressFormOpen)}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm md:text-base font-medium hover:bg-primary-dark transition-colors"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="+91 9876543210"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <input
                          type="text"
                          value={newAddress.address}
                          onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="123 Main Street"
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={newAddress.postalCode}
                            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="400001"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          <input
                            type="text"
                            value={newAddress.country}
                            onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Landmark (Optional)</label>
                        <input
                          type="text"
                          value={newAddress.landmark || ''}
                          onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Near City Mall"
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
                        disabled={isCreatingAddress}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {isCreatingAddress ? 'Saving...' : 'Save Address'}
                      </button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {isLoadingAddresses ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading addresses...</p>
                      </div>
                    ) : addresses.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No saved addresses</p>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{address.label || address.name}</h4>
                                {address.isDefault && (
                                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {address.fullName} • {address.phone}
                              </p>
                              <p className="text-sm text-gray-700 mt-1">
                                {address.street || address.address}, {address.city}, {address.state} {address.postalCode || address.zipCode}, {address.country}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {!address.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(address.id)}
                                  disabled={isSettingDefaultAddress}
                                  className="text-primary hover:text-primary-dark text-sm font-medium disabled:opacity-50"
                                >
                                  {isSettingDefaultAddress ? 'Setting...' : 'Set Default'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteAddress(address.id)}
                                disabled={isDeletingAddress}
                                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                              >
                                {isDeletingAddress ? 'Deleting...' : 'Delete'}
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Recent Orders</h3>
                    <Link
                      href="/orders"
                      className="text-primary hover:text-primary-dark font-medium text-sm md:text-base transition-colors flex items-center gap-1"
                    >
                      View All Orders
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500 mb-4">No orders yet</p>
                      <Link
                        href="/products"
                        className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/orders/${order.id}`}
                          className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {order.orderNumber || `Order ${order.id.slice(0, 8)}...`}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                  'bg-primary/20 text-primary-dark'
                                }`}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {order.items.length} item{order.items.length !== 1 ? 's' : ''} • ₹{order.total.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                      <Link
                        href="/orders"
                        className="block text-center px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                      >
                        View All Orders
                      </Link>
                    </div>
                  )}
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
                          onClick={() => setShowClearActivityConfirm(true)}
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

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />

      {/* Delete Address Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAddressConfirm !== null}
        onClose={() => setShowDeleteAddressConfirm(null)}
        onConfirm={confirmDeleteAddress}
        title="Delete Address"
        message="Are you sure you want to delete this address?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="This action cannot be undone. Are you absolutely sure you want to delete your account?"
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
      />

      {/* Clear Activity Log Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearActivityConfirm}
        onClose={() => setShowClearActivityConfirm(false)}
        onConfirm={() => {
          clearActivityLog();
          logActivity('activity_log_cleared', { userId: user?.phone });
          setShowClearActivityConfirm(false);
        }}
        title="Clear Activity Log"
        message="Are you sure you want to clear your activity log? This action cannot be undone."
        confirmText="Yes, Clear"
        cancelText="Cancel"
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
        <Container>
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Profile', href: '/profile' }]} />
          <div className="animate-pulse mt-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Container>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}

