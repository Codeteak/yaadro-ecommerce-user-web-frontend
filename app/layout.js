import './globals.css';
import QueryProvider from '../components/QueryProvider';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { AddressProvider } from '../context/AddressContext';
import { AuthProvider } from '../context/AuthContext';
import { ActivityLogProvider } from '../context/ActivityLogContext';
import { RecentlyViewedProvider } from '../context/RecentlyViewedContext';
import { OrderProvider } from '../context/OrderContext';
import { AlertProvider } from '../context/AlertContext';
import { BottomNavVisibilityProvider } from '../context/BottomNavVisibilityContext';
import { LayoutHeightsProvider } from '../context/LayoutHeightsContext';
import { LocationServiceProvider } from '../context/LocationServiceContext';
import ConditionalLayout from '../components/ConditionalLayout';
import MobileBottomNav from '../components/MobileBottomNav';
import CartSidebar from '../components/CartSidebar';
import LoginBottomSheetWrapper from '../components/LoginBottomSheetWrapper';
import ServiceAreaBottomSheet from '../components/ServiceAreaBottomSheet';
import ClientOnly from '../components/ClientOnly';

export const metadata = {
  title: 'Yaadro - Professional Supermarket Ecommerce',
  description: 'Professional supermarket ecommerce platform',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#FF8D21',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-full" style={{ overflowX: 'hidden' }}>
      <body
        className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full"
        style={{ overflowX: 'hidden', maxWidth: '100vw' }}
      >
        <ClientOnly fallback={<div className="min-h-screen w-full bg-gray-50" />}>
          <QueryProvider>
            <AuthProvider>
              <AlertProvider>
                <CartProvider>
                  <WishlistProvider>
                    <AddressProvider>
                      <ActivityLogProvider>
                        <RecentlyViewedProvider>
                          <OrderProvider>
                            <BottomNavVisibilityProvider>
                              <LayoutHeightsProvider>
                                <LocationServiceProvider>
                                  <ConditionalLayout>
                                    {children}
                                  </ConditionalLayout>
                                  <MobileBottomNav />
                                  <CartSidebar />
                                  <LoginBottomSheetWrapper />
                                  <ServiceAreaBottomSheet />
                                </LocationServiceProvider>
                              </LayoutHeightsProvider>
                            </BottomNavVisibilityProvider>
                          </OrderProvider>
                        </RecentlyViewedProvider>
                      </ActivityLogProvider>
                    </AddressProvider>
                  </WishlistProvider>
                </CartProvider>
              </AlertProvider>
            </AuthProvider>
          </QueryProvider>
        </ClientOnly>
      </body>
    </html>
  );
}

