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
import ServiceAreaBottomSheet from '../components/ServiceAreaBottomSheet';
import ClientOnly from '../components/ClientOnly';
import { ShopBrandingProvider } from '../context/ShopBrandingContext';

export const metadata = {
  title: {
    default: 'Yaadro',
    template: '%s | Yaadro',
  },
  description: 'Professional supermarket ecommerce platform',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'Yaadro',
  },
};

export const viewport = {
  themeColor: '#FF8D21',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-clip w-full max-w-full" style={{ overflowX: 'clip' }}>
      <body
        className="flex flex-col min-h-screen bg-white overflow-x-clip w-full max-w-full"
        style={{ overflowX: 'clip', maxWidth: '100vw' }}
      >
        <ClientOnly fallback={<div className="min-h-screen w-full bg-white" />}>
          <ShopBrandingProvider>
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
          </ShopBrandingProvider>
        </ClientOnly>
      </body>
    </html>
  );
}

