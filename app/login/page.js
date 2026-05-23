import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
