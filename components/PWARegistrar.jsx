'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/pwa/registerServiceWorker';
import { syncAppScrollLockFromBody } from '../lib/pwa/appShell';

export default function PWARegistrar() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: minimal-ui)').matches
      || window.navigator.standalone === true;
    document.documentElement.classList.toggle('pwa-standalone', standalone);

    syncAppScrollLockFromBody();
    const observer = new MutationObserver(syncAppScrollLockFromBody);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
