"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { refreshStorefrontCatalog } from "@/lib/catalog/refresh-catalog";
import { SHOP_QUOTE_EVENT } from "@/lib/cart-checkout-rules";
import { resolveClientShopId } from "@/lib/resolved-shop";

const REFRESH_GAP_MS = 4000;
const POLL_MS = 8000;
/** Give up on Socket.IO after this many connect failures; revision poll keeps working. */
const SOCKET_FAIL_LIMIT = 3;

function realtimeEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED;
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return Boolean(process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN?.trim());
}

function apiOrigin(): string {
  const raw = (
    process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
  return raw;
}

/**
 * When admin changes a price or adds a coupon, the customer API emits
 * catalog.invalidated. Clear the cached catalog and the coupons list,
 * then refresh this page. If the socket is down, watch the revision number.
 */
export function CatalogLivePrices() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    if (!realtimeEnabled()) return;

    const shopId = resolveClientShopId();
    const token = process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN?.trim() ?? "";
    const origin = apiOrigin();
    if (!shopId || !token || !origin) return;

    let cancelled = false;
    let socket: { disconnect: () => void } | null = null;
    let connected = false;
    let socketAbandoned = false;
    let failCount = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let lastGeneration: number | null = null;

    const refresh = () => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        if (refreshing.current) return;
        refreshing.current = true;
        void refreshStorefrontCatalog()
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["coupons"] });
            router.refresh();
          })
          .finally(() => {
            refreshing.current = false;
          });
      }, REFRESH_GAP_MS);
    };

    const poll = async () => {
      if (cancelled || connected) return;
      try {
        const response = await fetch("/shop-api/api/storefront/catalog/revision", {
          headers: { accept: "application/json", "x-shop-id": shopId },
          cache: "no-store",
        });
        if (response.ok) {
          const body = (await response.json()) as { generation?: unknown };
          const generation = Number(body.generation);
          if (Number.isFinite(generation)) {
            if (lastGeneration != null && generation !== lastGeneration) refresh();
            lastGeneration = generation;
          }
        }
      } catch {
        // Socket is preferred when available; poll retries quietly.
      }
      if (!cancelled && !connected) pollTimer = setTimeout(() => void poll(), POLL_MS);
    };

    const startPoll = () => {
      if (pollTimer || connected) return;
      void poll();
    };

    const stopPoll = () => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };

    const abandonSocket = (next: { disconnect: () => void }) => {
      if (socketAbandoned) return;
      socketAbandoned = true;
      connected = false;
      next.disconnect();
      startPoll();
    };

    void import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      const next = io(origin, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { shopId, token },
        reconnection: true,
        reconnectionAttempts: SOCKET_FAIL_LIMIT,
        reconnectionDelay: 2_000,
        reconnectionDelayMax: 8_000,
        timeout: 12_000,
      });
      socket = next;
      next.on("connect", () => {
        failCount = 0;
        connected = true;
        stopPoll();
      });
      next.on("disconnect", () => {
        connected = false;
        if (!socketAbandoned) startPoll();
      });
      next.on("connect_error", () => {
        connected = false;
        failCount += 1;
        startPoll();
        if (failCount >= SOCKET_FAIL_LIMIT) abandonSocket(next);
      });
      next.on("reconnect_failed", () => {
        abandonSocket(next);
      });
      next.on("catalog.invalidated", () => refresh());
      next.on("shop.min_purchase.updated", () => {
        window.dispatchEvent(new Event(SHOP_QUOTE_EVENT));
      });
    });

    startPoll();

    return () => {
      cancelled = true;
      stopPoll();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socket?.disconnect();
    };
  }, [queryClient, router]);

  return null;
}
