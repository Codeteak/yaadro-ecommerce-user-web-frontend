'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@heroui/react';
import {
  hasSeenInstallPrompt,
  isInstallPromptHomePath,
  markInstallPromptSeen,
} from '../lib/pwa/installPromptSeen';
import { useUiStore } from '../stores/uiStore';
import { BRAND_PRIMARY_BTN } from './ui/brandButton';

export default function InstallPrompt() {
  const pathname = usePathname();
  const isHome = isInstallPromptHomePath(pathname);
  const installPromptDismissed = useUiStore((s) => s.installPromptDismissed);
  const deferredInstallPrompt = useUiStore((s) => s.deferredInstallPrompt);
  const setDeferredInstallPrompt = useUiStore((s) => s.setDeferredInstallPrompt);
  const dismissInstallPrompt = useUiStore((s) => s.dismissInstallPrompt);
  const clearDeferredInstallPrompt = useUiStore((s) => s.clearDeferredInstallPrompt);

  useEffect(() => {
    if (hasSeenInstallPrompt()) {
      dismissInstallPrompt();
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      if (hasSeenInstallPrompt()) return;
      if (!isInstallPromptHomePath(window.location.pathname)) return;
      markInstallPromptSeen();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [setDeferredInstallPrompt, dismissInstallPrompt]);

  if (!isHome || installPromptDismissed || !deferredInstallPrompt) return null;

  const handleInstall = async () => {
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } finally {
      clearDeferredInstallPrompt();
      dismissInstallPrompt();
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl border border-violet-200 bg-white p-4 shadow-xl md:bottom-6">
      <p className="text-sm font-semibold text-gray-900">Install app</p>
      <p className="mt-1 text-xs text-gray-600">Add this store to your home screen for faster access.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="primary" className={`flex-1 ${BRAND_PRIMARY_BTN}`} onPress={handleInstall}>
          Install
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1"
          onPress={() => {
            clearDeferredInstallPrompt();
            dismissInstallPrompt();
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
