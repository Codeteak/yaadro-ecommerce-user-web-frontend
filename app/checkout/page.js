'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import Container from '../../components/Container';
import Link from 'next/link';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { addresses, getDefaultAddress, addAddress, setAddresses } = useAddress();
  const { isAuthenticated, showLoginSheet, setShowLoginSheet } = useAuth();
  const { createOrder } = useOrder();
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    paymentMethod: 'cod',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const shipping = cartTotal > 0 ? 50 : 0;
  const grandTotal = cartTotal + shipping;

  // Check authentication when component mounts or when trying to checkout
  useEffect(() => {
    if (!isAuthenticated && cartItems.length > 0) {
      setShowLoginSheet(true);
    }
  }, [isAuthenticated, cartItems.length, setShowLoginSheet]);

  // Set default address and form data on mount
  useEffect(() => {
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setFormData(prev => ({
        ...prev,
        fullName: defaultAddress.fullName,
        phone: defaultAddress.phone,
      }));
    }
  }, [getDefaultAddress]);

  // Update form data when address is selected
  useEffect(() => {
    if (selectedAddressId) {
      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        setFormData(prev => ({
          ...prev,
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
        }));
      }
    }
  }, [selectedAddressId, addresses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EcommerceApp/1.0'
          }
        }
      );
      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  const handleFetchLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const addressData = await reverseGeocode(latitude, longitude);
          
          if (addressData) {
            const newAddress = {
              name: 'Current Location',
              fullName: formData.fullName || 'My Location',
              phone: formData.phone || '',
              address: addressData.road || addressData.house_number || '',
              city: addressData.city || addressData.town || addressData.village || '',
              state: addressData.state || '',
              postalCode: addressData.postcode || '',
              country: addressData.country || 'India',
              isDefault: false,
            };

            // Add the new address and get the new ID
            const currentAddresses = JSON.parse(localStorage.getItem('addresses') || '[]');
            const newId = currentAddresses.length > 0 ? Math.max(...currentAddresses.map(a => a.id)) + 1 : 1;
            const addressWithId = { ...newAddress, id: newId };
            
            addAddress(addressWithId);
            
            // Select the newly added address
            setSelectedAddressId(newId);

            alert('Location fetched successfully! Address added to your saved addresses.');
          } else {
            alert('Could not fetch address details. Please try again.');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          alert('Error fetching address details. Please try again.');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        setIsFetchingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location access denied. Please enable location permissions in your browser settings.');
        } else {
          alert('Error fetching location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginSheet(true);
      return;
    }
    
    if (!selectedAddressId) {
      alert('Please select a shipping address');
      return;
    }

    setIsSubmitting(true);

    // Get selected address details
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create order
    const shipping = cartTotal > 0 ? 50 : 0;
    const order = createOrder({
      items: cartItems,
      subtotal: cartTotal,
      shipping,
      total: cartTotal + shipping,
      shippingAddress: selectedAddress,
      paymentMethod: formData.paymentMethod,
      customerName: formData.fullName,
      customerPhone: formData.phone,
    });

    // Clear cart and redirect to success page with order ID
    clearCart();
    router.push(`/order-success?orderId=${order.id}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to your cart before checkout.</p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout', href: '/checkout' }]} />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-md space-y-5 md:space-y-6 w-full max-w-full overflow-x-hidden">
              {/* Shipping Address Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Shipping Address</h2>
                  <Link
                    href="/profile?tab=addresses"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    Manage Addresses
                  </Link>
                </div>
                
                {addresses.length === 0 ? (
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-gray-500 mb-4">No saved addresses found</p>
                    <Link
                      href="/profile?tab=addresses"
                      className="inline-block text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Add Address in Profile
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="address"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="mt-1 w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-800">{address.name}</span>
                              {address.isDefault && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {address.address}, {address.city}, {address.state} {address.postalCode}, {address.country}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {address.fullName} • {address.phone}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full max-w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">Payment Method</h2>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Cash on Delivery</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Card (Dummy)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </button>

              {/* Use Current Location Button */}
              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={isFetchingLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingLocation ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Fetching Location...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Use Current Location</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md lg:sticky lg:top-24">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-700">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{cartTotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping:</span>
                  <span className="font-semibold">
                    {shipping > 0 ? `₹${shipping.toFixed(0)}` : 'Free'}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span>₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

