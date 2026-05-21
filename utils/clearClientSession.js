import { clearSessionExpiresAt } from './authSession';

/**
 * Clear all client-side user session, cart, and preference data (logout / account delete).
 */
export function clearAllClientSessionData() {
  if (typeof window === 'undefined') return;

  const keys = [
    'user',
    'token',
    'authToken',
    'accessToken',
    'refreshToken',
    'cart',
    'cartApiCache',
    'cartLastActivity',
    'wishlist',
    'addresses',
    'activityLog',
    'privacySettings',
    'savedCarts',
    'cartTemplates',
    'yaadro-delivery-check-v1',
    'yaadro-service-area-warned',
  ];

  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  try {
    window.sessionStorage.removeItem('yaadro-service-area-warned');
  } catch {
    /* ignore */
  }

  clearSessionExpiresAt();
}
