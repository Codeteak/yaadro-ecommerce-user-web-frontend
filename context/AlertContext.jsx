'use client';

import { createContext, useContext } from 'react';
import AlertModal from '../components/AlertModal';
import { useUiStore } from '../stores/uiStore';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const alert = useUiStore((s) => s.alert);
  const showAlert = useUiStore((s) => s.showAlert);
  const hideAlert = useUiStore((s) => s.hideAlert);

  const value = {
    showAlert,
    hideAlert,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertModal
        isOpen={alert.isOpen}
        onClose={hideAlert}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
