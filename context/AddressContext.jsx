'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AddressContext = createContext();

export function AddressProvider({ children }) {
  const [addresses, setAddresses] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Initialize addresses from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedAddresses = localStorage.getItem('addresses');
      if (savedAddresses) {
        try {
          setAddresses(JSON.parse(savedAddresses));
        } catch (error) {
          console.error('Error parsing addresses from localStorage:', error);
        }
      } else {
        // Set default address if none exist
        const defaultAddress = [{
          id: 1,
          name: 'Home',
          fullName: 'John Doe',
          phone: '+91 9876543210',
          address: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
          isDefault: true,
        }];
        setAddresses(defaultAddress);
        localStorage.setItem('addresses', JSON.stringify(defaultAddress));
      }
    }
  }, []);

  // Save addresses to localStorage whenever they change
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('addresses', JSON.stringify(addresses));
    }
  }, [addresses, isClient]);

  const addAddress = (address) => {
    const newAddress = {
      ...address,
      id: addresses.length > 0 ? Math.max(...addresses.map(a => a.id)) + 1 : 1,
    };
    setAddresses(prev => [...prev, newAddress]);
  };

  const updateAddress = (id, updatedAddress) => {
    setAddresses(prev =>
      prev.map(addr => addr.id === id ? { ...addr, ...updatedAddress } : addr)
    );
  };

  const deleteAddress = (id) => {
    setAddresses(prev => prev.filter(addr => addr.id !== id));
  };

  const setDefaultAddress = (id) => {
    setAddresses(prev =>
      prev.map(addr => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const getDefaultAddress = () => {
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  };

  const value = {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    setAddresses,
  };

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
}

