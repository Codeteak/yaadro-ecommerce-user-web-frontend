import { Suspense } from 'react';
import VerifyLinkClient from './VerifyLinkClient';

export default function VerifyLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10">
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
              <h1 className="text-xl font-bold text-gray-900">Loading</h1>
              <p className="text-sm text-gray-600">Preparing verification…</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyLinkClient />
    </Suspense>
  );
}

