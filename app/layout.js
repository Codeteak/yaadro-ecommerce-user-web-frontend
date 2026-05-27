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

/** Static SEO for marketfresh.in — crawlers (WhatsApp, Google) read this from exported HTML. */
const SITE_ORIGIN = 'https://marketfresh.in';
const SHOP_NAME = 'MARKET FRESH';
const SHOP_TITLE = 'MARKET FRESH – Online Grocery';
const SHOP_DESCRIPTION = 'Order groceries online from MARKET FRESH.';
const SHOP_OG_IMAGE =
  'https://media.yaadro.online/shops/52299f14-e9db-4ffe-8cda-1b93fb9d081c/a21594a2b7cfd98a20b99881927e1a094c473bc6de4f1096126efe6873258cb4.jpg';

export const metadata = {
  title: {
    default: SHOP_TITLE,
    template: `%s | ${SHOP_NAME}`,
  },
  description: SHOP_DESCRIPTION,
  manifest: '/manifest.json',
  metadataBase: new URL(SITE_ORIGIN),
  alternates: { canonical: SITE_ORIGIN },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: SHOP_NAME,
    title: SHOP_TITLE,
    description: SHOP_DESCRIPTION,
    url: SITE_ORIGIN,
    images: [
      {
        url: SHOP_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SHOP_NAME} storefront`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHOP_TITLE,
    description: SHOP_DESCRIPTION,
    images: [SHOP_OG_IMAGE],
  },
  icons: {
    icon: [{ url: SHOP_OG_IMAGE }],
    apple: [{ url: SHOP_OG_IMAGE }],
  },
};

export const viewport = {
  themeColor: '#16a34a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className="overflow-x-clip w-full max-w-full" style={{ overflowX: 'clip' }}>
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
