import './globals.css';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { AddressProvider } from '../context/AddressContext';
import { AuthProvider } from '../context/AuthContext';
import { ActivityLogProvider } from '../context/ActivityLogContext';
import { RecentlyViewedProvider } from '../context/RecentlyViewedContext';
import { ProductComparisonProvider } from '../context/ProductComparisonContext';
import { OrderProvider } from '../context/OrderContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MobileCartSheetWrapper from '../components/MobileCartSheetWrapper';
import MobileBottomNav from '../components/MobileBottomNav';
import CartNotification from '../components/CartNotification';
import CartSidebar from '../components/CartSidebar';
import LoginBottomSheetWrapper from '../components/LoginBottomSheetWrapper';
import ProductComparisonWrapper from '../components/ProductComparisonWrapper';

export const metadata = {
  title: 'Codeteak Store - Simple E-Commerce MVP',
  description: 'A simple e-commerce MVP built with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-full" style={{ overflowX: 'hidden' }}>
      <body className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
        <CartProvider>
          <WishlistProvider>
            <AddressProvider>
              <AuthProvider>
                <ActivityLogProvider>
                  <RecentlyViewedProvider>
                    <ProductComparisonProvider>
                      <OrderProvider>
                        <Navbar />
                <main
                  className="flex-grow w-full max-w-full overflow-x-hidden pb-16 md:pb-0 pt-40 md:pt-28"
                  style={{ overflowX: 'hidden', maxWidth: '100vw' }}
                >
                  {children}
                </main>
                <Footer />
                <MobileCartSheetWrapper />
                <MobileBottomNav />
                <CartNotification />
                <CartSidebar />
                <LoginBottomSheetWrapper />
                <ProductComparisonWrapper />
                      </OrderProvider>
                    </ProductComparisonProvider>
                  </RecentlyViewedProvider>
                </ActivityLogProvider>
              </AuthProvider>
            </AddressProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

