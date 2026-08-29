'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Google OAuth is not available on this Customer API. Send users to phone OTP login. */
export default function OAuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-sm text-gray-600">Google sign-in is not available. Redirecting to phone login…</p>
    </div>
  );
}
