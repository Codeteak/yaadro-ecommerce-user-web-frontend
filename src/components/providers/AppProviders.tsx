"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import { ShopResolveBootstrap } from "@/components/shop/ShopResolveBootstrap";
import { ToastViewport } from "@/components/ui/Toast";
import { ensureCustomerSessionRestored } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { setSessionExpiredHandler } from "@/lib/api/session";
import { syncServerDeliveryAddress } from "@/lib/sync-server-address";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry(failureCount, error) {
          if (error instanceof ApiError && error.status > 0 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(makeClient);

  useEffect(() => {
    setSessionExpiredHandler((returnTo) => {
      client.clear();
      if (window.location.pathname.startsWith("/login")) return;
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
    });
    void ensureCustomerSessionRestored().then((ok) => {
      if (!ok) {
        client.clear();
        return;
      }
      void syncServerDeliveryAddress();
    });
    return () => setSessionExpiredHandler(null);
  }, [client, router]);

  return (
    <QueryClientProvider client={client}>
      <ShopResolveBootstrap />
      <PwaRegistrar />
      {children}
      {/* usePathname in InstallPrompt suspends on dynamic routes — keep under Suspense. */}
      <Suspense fallback={null}>
        <InstallPrompt />
      </Suspense>
      <ToastViewport />
    </QueryClientProvider>
  );
}
