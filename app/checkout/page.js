'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Image from 'next/image';
import { Wallet } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useCreateOrder, useVerifyPayment } from '../../hooks/useOrders';
import Link from 'next/link';
import CheckoutBottomSheet from '../../components/CheckoutBottomSheet';
import CheckoutAddAddressSheet from '../../components/CheckoutAddAddressSheet';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { 
    addresses, 
    getDefaultAddress, 
    addAddress,
    isLoading: isLoadingAddresses,
    isCreating: isCreatingAddress,
  } = useAddress();
  const { isAuthenticated, user, setShowLoginSheet } = useAuth();
  const { showAlert } = useAlert();
  const createOrderMutation = useCreateOrder();
  const verifyPaymentMutation = useVerifyPayment();
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    paymentMethod: 'cod',
    notes: '',
    offerCode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(true);
  const [showAddAddressSheet, setShowAddAddressSheet] = useState(false);

  const shipping = cartTotal > 0 ? 50 : 0;
  const discount = formData.offerCode ? 30 : 0; // This would come from offer code validation
  const grandTotal = cartTotal + shipping - discount;
  
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

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

  const handleCreateAddressFromCheckout = async (addressData) => {
    try {
      const created = await addAddress(addressData);
      if (created?.id) {
        setSelectedAddressId(created.id);
        setFormData((prev) => ({
          ...prev,
          fullName: created.fullName || prev.fullName,
          phone: created.phone || prev.phone,
        }));
      }
      setShowAddAddressSheet(false);
      showAlert('Address added successfully!', 'Success', 'success');
    } catch (error) {
      console.error('Error adding address from checkout:', error);
      showAlert(error?.message || 'Failed to add address. Please try again.', 'Error', 'error');
    }
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
      showAlert('Geolocation is not supported by your browser', 'Error', 'error');
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

            // Add the new address via API
            try {
              const savedAddress = await addAddress({
                label: 'Current Location',
                fullName: formData.fullName || 'My Location',
                phone: formData.phone || '',
                street: newAddress.address,
                address: newAddress.address,
                city: newAddress.city,
                state: newAddress.state,
                postalCode: newAddress.postalCode,
                zipCode: newAddress.postalCode,
                country: newAddress.country,
                isDefault: false,
              });
              
              // Select the newly added address
              setSelectedAddressId(savedAddress.id);

              showAlert('Location fetched successfully! Address added to your saved addresses.', 'Success', 'success');
            } catch (error) {
              console.error('Error adding address:', error);
              showAlert('Failed to save address. Please try again.', 'Error', 'error');
            }
          } else {
            showAlert('Could not fetch address details. Please try again.', 'Error', 'error');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          showAlert('Error fetching address details. Please try again.', 'Error', 'error');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        setIsFetchingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          showAlert('Location access denied. Please enable location permissions in your browser settings.', 'Permission Denied', 'warning');
        } else {
          showAlert('Error fetching location. Please try again.', 'Error', 'error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Initialize Razorpay and suppress harmless warnings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Suppress harmless "unsafe header" warnings from Razorpay SDK
      const originalWarn = console.warn;
      console.warn = function(...args) {
        const message = args[0]?.toString() || '';
        // Suppress Razorpay's unsafe header warnings (harmless browser security warnings)
        if (message.includes('unsafe header') || message.includes('x-rtb-fingerprint-id')) {
          return;
        }
        originalWarn.apply(console, args);
      };

      if (window.Razorpay) {
        setRazorpayLoaded(true);
      }

      return () => {
        console.warn = originalWarn;
      };
    }
  }, []);

  const handleRazorpayPayment = async (orderResponse) => {
    if (!window.Razorpay) {
      showAlert('Razorpay SDK not loaded. Please refresh the page.', 'Error', 'error');
      setIsSubmitting(false);
      return;
    }

    const { order, payment } = orderResponse;
    const rzpData = payment?.razorpay;

    if (!rzpData) {
      showAlert('Payment initialization failed. Please try again.', 'Error', 'error');
      setIsSubmitting(false);
      return;
    }

    // Validate required Razorpay data
    if (!rzpData.keyId || !rzpData.razorpayOrderId || !rzpData.amount) {
      console.error('Invalid Razorpay data:', rzpData);
      showAlert('Invalid payment configuration. Please contact support.', 'Error', 'error');
      setIsSubmitting(false);
      return;
    }

    const options = {
      key: rzpData.keyId,
      amount: rzpData.amount, // Already in paise
      currency: rzpData.currency || 'INR',
      order_id: rzpData.razorpayOrderId,
      name: 'Yaadro',
      description: `Order ${order.orderNumber}`,
      handler: async function (paymentResponse) {
        try {
          // Verify payment with backend
          await verifyPaymentMutation.mutateAsync({
            orderId: order.id,
            paymentData: {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            },
          });

          // Clear cart and redirect to success page
          await clearCart();
          router.push(`/order-success?orderId=${order.id}&payment=success`);
        } catch (error) {
          console.error('Payment verification failed:', error);
          showAlert('Payment verification failed. Please contact support with order ID: ' + order.orderNumber, 'Payment Failed', 'error');
          router.push(`/order-success?orderId=${order.id}&payment=failed`);
        }
      },
      prefill: {
        name: user?.name || formData.fullName || '',
        email: user?.email || '',
        contact: formData.phone || user?.phone || '',
      },
      theme: {
        color: '#FF8D21', // primary
      },
      modal: {
        ondismiss: function() {
          console.log('Payment cancelled');
          setIsSubmitting(false);
          router.push(`/order-success?orderId=${order.id}&payment=cancelled`);
        },
      },
      notes: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setIsSubmitting(false);
        router.push(`/order-success?orderId=${order.id}&payment=failed`);
      });
      rzp.open();
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      showAlert('Failed to open payment gateway. Please try again.', 'Error', 'error');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginSheet(true);
      return;
    }
    
    if (!selectedAddressId) {
      showAlert('Please select a shipping address', 'Required', 'warning');
      return;
    }

    if (cartItems.length === 0) {
      showAlert('Your cart is empty', 'Empty Cart', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get selected address details
      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

      if (!selectedAddress) {
        showAlert('Please select a valid shipping address', 'Required', 'warning');
        setIsSubmitting(false);
        return;
      }

      // Prepare order data
      const orderData = {
        delivery_address: {
          street: selectedAddress.address || '',
          city: selectedAddress.city || '',
          state: selectedAddress.state || '',
          zipCode: selectedAddress.postalCode || '',
          country: selectedAddress.country || 'India',
        },
        payment_method: formData.paymentMethod,
        notes: formData.notes || undefined,
        offer_code: formData.offerCode || undefined,
      };

      // Create order via API
      const orderResponse = await createOrderMutation.mutateAsync(orderData);

      if (!orderResponse?.order) {
        throw new Error('Failed to create order');
      }

      const { order, payment } = orderResponse;

      // Handle payment based on method
      if (formData.paymentMethod === 'cod') {
        // Cash on Delivery - no payment needed
        await clearCart();
        router.push(`/order-success?orderId=${order.id}&payment=cod`);
      } else {
        // Online payment - initialize Razorpay
        if (!razorpayLoaded && !window.Razorpay) {
          // Load Razorpay script
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => {
            setRazorpayLoaded(true);
            handleRazorpayPayment(orderResponse);
          };
          script.onerror = () => {
            showAlert('Failed to load payment gateway. Please try again.', 'Error', 'error');
            setIsSubmitting(false);
          };
          document.body.appendChild(script);
        } else {
          await handleRazorpayPayment(orderResponse);
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      showAlert(error.message || 'Failed to create order. Please try again.', 'Error', 'error');
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-green-50/30">
        <div className="py-16 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to your cart before checkout.</p>
            <Link
              href="/products"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50/30 pb-[55vh] md:pb-32">
      {/* Load Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => console.error('Failed to load Razorpay SDK')}
      />
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between h-14">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
        <button className="p-1.5 -mr-1.5" aria-label="Menu">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="min-h-screen">
        <div className="px-4 pt-14 pb-4 space-y-4">
          <div className="pt-2">
            <h2 className="text-lg font-bold text-gray-900 mb-2.5">Choose payment Method</h2>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3 flex-1">
                  {/* Payment Method Icon */}
                  {formData.paymentMethod === 'cod' ? (
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  ) : formData.paymentMethod === 'upi' ? (
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">UPI</span>
                    </div>
                  ) : formData.paymentMethod === 'card' ? (
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-orange-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 capitalize">
                      {formData.paymentMethod === 'cod' ? 'Cash on Delivery' : formData.paymentMethod === 'upi' ? 'UPI Payment' : formData.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Wallet'}
                    </div>
                    {formData.paymentMethod === 'card' && (
                      <div className="text-sm text-gray-500 mt-0.5">**** **** 4336 2478</div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    checked={true}
                    readOnly
                    className="w-5 h-5 text-primary"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  </div>
                </div>
              </label>
              
              {/* Payment Method Options */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {['cod', 'upi', 'card', 'wallet'].map((method) => (
                  method !== formData.paymentMethod && (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {method === 'cod' ? (
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      ) : method === 'upi' ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xs">UPI</span>
                        </div>
                      ) : method === 'card' ? (
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-orange-600" />
                        </div>
                      )}
                      <span className="text-sm text-gray-700 capitalize">
                        {method === 'cod' ? 'Cash on Delivery' : method === 'upi' ? 'UPI Payment' : method === 'card' ? 'Credit/Debit Card' : 'Wallet'}
                      </span>
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2.5">Shipping address</h2>

            {isLoadingAddresses ? (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-gray-500 mb-4 text-sm">No saved addresses found</p>
                <p className="text-xs text-gray-500">Tap “Add New Address” below to add one now.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[34vh] overflow-y-auto pr-1 overscroll-contain">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all ${
                      selectedAddressId === address.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">{address.label || address.name || 'Address'}</div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {address.street || address.address}, {address.city}, {address.state} {address.postalCode || address.zipCode}, {address.country}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {selectedAddressId === address.id && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* Add new address (from checkout) - placed after the list */}
            <button
              type="button"
              onClick={() => setShowAddAddressSheet(true)}
              className="w-full mt-3 bg-white border-2 border-primary/30 text-primary-dark px-5 py-4 rounded-2xl font-extrabold hover:bg-primary/10 transition-colors flex items-center justify-center gap-3 shadow-sm"
            >
              <span className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              Add New Address
            </button>
          </div>

        </div>
      </form>

      <CheckoutAddAddressSheet
        isOpen={showAddAddressSheet}
        onClose={() => setShowAddAddressSheet(false)}
        onCreate={handleCreateAddressFromCheckout}
        isSubmitting={isCreatingAddress}
        initialFullName={user?.name || ''}
        initialPhone={user?.phone || ''}
      />

      {/* Bottom Sheet for Order Summary and Checkout */}
      <CheckoutBottomSheet
        isOpen={showBottomSheet}
        cartItems={cartItems}
        cartTotal={cartTotal}
        shipping={shipping}
        discount={discount}
        grandTotal={grandTotal}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canSubmit={!!selectedAddressId}
      />
    </div>
  );
}

