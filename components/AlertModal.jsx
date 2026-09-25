'use client';

import { useEffect } from 'react';
import { Button } from '@heroui/react';
import {
  AlertRegular as AlertCircle,
  AlertRegular as AlertTriangle,
  CheckCircleRegular as CheckCircle,
  InformationRegular as Info,
} from './icons';
import {
  ModalDialogRoot,
  ModalDialogContent,
  ModalDialogTitle,
  ModalDialogDescription,
} from './ui/ModalDialog';
import { BRAND_PRIMARY_BTN } from './ui/brandButton';
import { lockAppScroll, unlockAppScroll } from '../lib/pwa/appShell';

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    lockAppScroll();
    return () => {
      unlockAppScroll();
    };
  }, [isOpen]);

  const tone =
    type === 'success'
      ? {
          shell: 'border-primary/25 bg-white',
          header: 'border-primary/10 bg-gradient-to-b from-primary/10 to-white',
          iconWrap: 'bg-primary/15 text-primary',
          icon: <CheckCircle size={22} className="h-5 w-5" />,
          button: BRAND_PRIMARY_BTN,
        }
      : type === 'error'
        ? {
            shell: 'border-red-200/90 bg-white',
            header: 'border-red-100 bg-gradient-to-b from-red-50/90 to-white',
            iconWrap: 'bg-red-100 text-red-700',
            icon: <AlertCircle size={22} className="h-5 w-5" />,
            button: 'bg-red-600 text-white hover:bg-red-700',
          }
        : type === 'warning'
          ? {
              shell: 'border-amber-200/80 bg-white',
              header: 'border-amber-100/80 bg-gradient-to-b from-amber-50/90 to-white',
              iconWrap: 'bg-amber-100 text-amber-700',
              icon: <AlertTriangle size={22} className="h-5 w-5" />,
              button: BRAND_PRIMARY_BTN,
            }
          : {
              shell: 'border-blue-200/80 bg-white',
              header: 'border-blue-100 bg-gradient-to-b from-blue-50/90 to-white',
              iconWrap: 'bg-blue-100 text-blue-700',
              icon: <Info size={22} className="h-5 w-5" />,
              button: 'bg-blue-600 text-white hover:bg-blue-700',
            };

  return (
    <ModalDialogRoot open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <ModalDialogContent
        className={`overflow-hidden border p-0 shadow-xl ${tone.shell}`}
        onClose={onClose}
        showClose
      >
        <div className={`border-b px-6 pb-4 pt-6 pr-12 ${tone.header}`}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}
            >
              {tone.icon}
            </span>
            <ModalDialogTitle className="pt-1.5 text-[1.05rem] font-semibold leading-snug text-gray-900">
              {title || 'Notification'}
            </ModalDialogTitle>
          </div>
        </div>
        <div className="px-6 py-4">
          <ModalDialogDescription className="text-[0.9375rem] leading-relaxed text-gray-600">
            {message}
          </ModalDialogDescription>
        </div>
        <div className="px-6 pb-6">
          <Button
            variant="primary"
            onPress={onClose}
            className={`w-full rounded-xl py-3 font-semibold ${tone.button}`}
          >
            OK
          </Button>
        </div>
      </ModalDialogContent>
    </ModalDialogRoot>
  );
}
