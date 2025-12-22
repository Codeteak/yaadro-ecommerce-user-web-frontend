'use client';

import { useCart } from '../context/CartContext';
import MobileCartSheet from './MobileCartSheet';
import CartFAB from './CartFAB';

export default function MobileCartSheetWrapper() {
  const { showMobileCart, setShowMobileCart } = useCart();

  return (
    <>
      <CartFAB />
      <MobileCartSheet
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
      />
    </>
  );
}

