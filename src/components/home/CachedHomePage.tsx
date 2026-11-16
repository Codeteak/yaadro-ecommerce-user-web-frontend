"use client";

import { HomePageView } from "@/components/home/HomePageView";
import { CachedSlot } from "@/components/navigation/CachedSlot";
import { StorefrontPageSkeleton } from "@/components/ui/skeletons";
import { loadHomePageData, type HomePageData } from "@/lib/api/page-data";
import { refreshCached, rememberPage } from "@/lib/page-cache";

const HOME_KEY = "home";

async function loadHome(): Promise<HomePageData> {
  const data = await loadHomePageData();
  if (data.catalog.ok) rememberPage("shop", data.shop, true);
  return data;
}

function homeOk(data: HomePageData) {
  return data.catalog.ok;
}

export function CachedHomePage() {
  return (
    <CachedSlot
      cacheKey={HOME_KEY}
      load={loadHome}
      persist={homeOk}
      fallback={<StorefrontPageSkeleton />}
    >
      {(data) => (
        <HomePageView
          data={data}
          onRefresh={async () => {
            await refreshCached(HOME_KEY, loadHome, homeOk);
          }}
        />
      )}
    </CachedSlot>
  );
}
