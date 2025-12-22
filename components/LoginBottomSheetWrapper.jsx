'use client';

import { useAuth } from '../context/AuthContext';
import LoginBottomSheet from './LoginBottomSheet';

export default function LoginBottomSheetWrapper() {
  const { showLoginSheet, setShowLoginSheet } = useAuth();

  return (
    <LoginBottomSheet
      isOpen={showLoginSheet}
      onClose={() => setShowLoginSheet(false)}
    />
  );
}

