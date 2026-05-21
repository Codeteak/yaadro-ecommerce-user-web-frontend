'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Loaded only in development — avoids bundling devtools in production static export / CI. */
function ReactQueryDevtoolsGate() {
  const [Devtools, setDevtools] = useState(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    void import('@tanstack/react-query-devtools').then((mod) => {
      setDevtools(() => mod.ReactQueryDevtools);
    });
  }, []);

  if (!Devtools) return null;

  return (
    <Devtools
      initialIsOpen={false}
      buttonPosition="top-left"
      position="bottom"
    />
  );
}

export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV !== 'production' ? <ReactQueryDevtoolsGate /> : null}
    </QueryClientProvider>
  );
}
