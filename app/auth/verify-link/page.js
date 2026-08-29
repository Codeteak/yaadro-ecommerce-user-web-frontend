'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Email magic-link login is not available. Send users to phone OTP login. */
export default function VerifyLinkPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-sm text-gray-600">Email sign-in is not available. Redirecting to phone login…</p>
    </div>
  );
}
