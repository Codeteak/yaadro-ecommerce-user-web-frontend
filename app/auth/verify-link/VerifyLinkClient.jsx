'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Container from '../../../components/Container';
import { apiFetch } from '../../../utils/apiClient';
import { useAuth } from '../../../context/AuthContext';

export default function VerifyLinkClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const email = useMemo(() => (searchParams?.get('email') || '').trim(), [searchParams]);
  const token = useMemo(() => (searchParams?.get('token') || '').trim(), [searchParams]);

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('Verifying your link…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!email || !token) {
        setStatus('error');
        setMessage('Invalid verification link. Missing email or token.');
        return;
      }

      try {
        const res = await apiFetch('/auth/verify-link', {
          method: 'GET',
          query: { email, token },
          returnResponse: true,
        });

        const data = res?.data || {};
        const user = data.user || null;
        const accessToken = data.token || data.accessToken || '';
        const refreshToken = data.refreshToken || '';

        if (!user || !accessToken) {
          throw new Error(res?.message || 'Verification failed. Please request a new link.');
        }

        login(user, { token: accessToken, refreshToken });

        if (cancelled) return;
        setStatus('success');
        setMessage(res?.message || 'Email verified! You’re now logged in.');

        setTimeout(() => {
          router.push('/');
        }, 900);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.message || 'Verification failed. Please request a new link.');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [email, token, login, router]);

  return (
    <div className="py-10">
      <Container>
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
              <h1 className="text-xl font-bold text-gray-900">Verifying</h1>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Verified</h1>
              <p className="text-sm text-gray-600">{message}</p>
              <p className="text-xs text-gray-500">Redirecting…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Link error</h1>
              <p className="text-sm text-gray-600">{message}</p>
              <button
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

