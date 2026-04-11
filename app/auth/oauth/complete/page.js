'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../../components/Container';
import { useAuth } from '../../../../context/AuthContext';
import { exchangeOAuthJwt, getShopIdFromEnv, normalizeSession } from '../../../../utils/authApi';

export default function OAuthCompletePage() {
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState('working'); // working | done | error
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const shopId = getShopIdFromEnv();
      if (!shopId) {
        setStatus('error');
        setMessage('Missing NEXT_PUBLIC_SHOP_ID. Add your shop UUID to the environment.');
        return;
      }

      try {
        const session = await exchangeOAuthJwt(shopId);
        const { user, token, refreshToken } = normalizeSession(session);
        if (!token || !user) {
          throw new Error('Could not read session from server.');
        }
        if (!cancelled) {
          login(user, { token, refreshToken });
          setStatus('done');
          setMessage('You’re signed in. Redirecting…');
          router.replace('/');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          err?.message ||
            'Google sign-in could not be completed. Try again, or use email and password.'
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [login, router]);

  return (
    <div className="py-10">
      <Container>
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
          {status === 'working' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
              <h1 className="text-xl font-bold text-gray-900">Signing you in</h1>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Sign-in incomplete</h1>
              <p className="text-sm text-gray-600">{message}</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition"
              >
                Go home
              </button>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
