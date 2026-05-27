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

/**
 * Build-time defaults only (same HTML for every tenant in `out/`).
 * Per-domain title, description, OG image → Cloudflare `functions/_middleware.js`
 * (resolve-by-domain + /seo/metadata). In-app → ShopBrandingContext (client).
 */
export const metadata = {
  title: {
    default: 'Online Grocery',
    template: '%s | Store',
  },
  description: 'Order groceries online from your local store.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
  },
};

export const viewport = {
  themeColor: '#16a34a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-clip w-full max-w-full" style={{ overflowX: 'clip' }}>
      <body
        className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip bg-white"
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
                                    <ConditionalLayout>{children}</ConditionalLayout>
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
