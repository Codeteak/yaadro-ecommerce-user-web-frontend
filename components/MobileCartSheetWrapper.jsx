'use client';

import { useCart } from '../context/CartContext';
import MobileCartSheet from './MobileCartSheet';

export default function MobileCartSheetWrapper() {
  const { showMobileCart, setShowMobileCart } = useCart();

  return (
    <>
      <MobileCartSheet
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
      />
    </>
  );
}

