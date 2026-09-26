'use client';

import { useEffect } from 'react';
import { ensurePortalRoot } from '../lib/pwa/safePortal';

/** Mount once so overlay portals have a stable body host before first paint. */
export default function PortalRootMount() {
  useEffect(() => {
    ensurePortalRoot();
  }, []);
  return null;
}
