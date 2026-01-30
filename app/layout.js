import './globals.css';
import QueryProvider from '../components/QueryProvider';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { AddressProvider } from '../context/AddressContext';
import { AuthProvider } from '../context/AuthContext';
import { ActivityLogProvider } from '../context/ActivityLogContext';
import { RecentlyViewedProvider } from '../context/RecentlyViewedContext';
import { ProductComparisonProvider } from '../context/ProductComparisonContext';
import { OrderProvider } from '../context/OrderContext';
import { AlertProvider } from '../context/AlertContext';
import { BottomNavVisibilityProvider } from '../context/BottomNavVisibilityContext';
import { LayoutHeightsProvider } from '../context/LayoutHeightsContext';
import ConditionalLayout from '../components/ConditionalLayout';
import MobileCartSheetWrapper from '../components/MobileCartSheetWrapper';
import MobileBottomNav from '../components/MobileBottomNav';
import CartNotification from '../components/CartNotification';
import CartSidebar from '../components/CartSidebar';
import LoginBottomSheetWrapper from '../components/LoginBottomSheetWrapper';
import ProductComparisonWrapper from '../components/ProductComparisonWrapper';
import CartFAB from '../components/CartFAB';

export const metadata = {
  title: 'Yaadro - Professional Supermarket Ecommerce',
  description: 'Professional supermarket ecommerce platform',
  manifest: '/manifest.json',
  themeColor: '#FF8D21',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-full" style={{ overflowX: 'hidden' }}>
      <body className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
        <QueryProvider>
          <AuthProvider>
            <AlertProvider>
              <CartProvider>
                <WishlistProvider>
                  <AddressProvider>
                    <ActivityLogProvider>
                      <RecentlyViewedProvider>
                        <ProductComparisonProvider>
                          <OrderProvider>
                            <BottomNavVisibilityProvider>
                              <LayoutHeightsProvider>
                                <ConditionalLayout>
                                  {children}
                                </ConditionalLayout>
                                <MobileCartSheetWrapper />
                                <MobileBottomNav />
                                <CartNotification />
                                <CartSidebar />
                                <LoginBottomSheetWrapper />
                                <ProductComparisonWrapper />
                                <CartFAB />
                              </LayoutHeightsProvider>
                            </BottomNavVisibilityProvider>
                          </OrderProvider>
                        </ProductComparisonProvider>
                      </RecentlyViewedProvider>
                    </ActivityLogProvider>
                  </AddressProvider>
                </WishlistProvider>
              </CartProvider>
            </AlertProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

