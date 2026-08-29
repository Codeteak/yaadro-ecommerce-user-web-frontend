'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/pwa/registerServiceWorker';

export default function PWARegistrar() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
