'use client';

import { useEffect } from 'react';
import { Button } from '@heroui/react';
import { AlertRegular as AlertTriangle } from './icons';
import {
  ModalDialogRoot,
  ModalDialogContent,
  ModalDialogTitle,
  ModalDialogDescription,
} from './ui/ModalDialog';
import { BRAND_PRIMARY_BTN } from './ui/brandButton';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  overlayClassName = 'z-50',
  /** When true, confirm/cancel are disabled (in-flight async). */
  isConfirming = false,
  /** Close after confirm (default). Set false when parent keeps modal open while submitting. */
  closeOnConfirm = true,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (isConfirming) return;
    onConfirm?.();
    if (closeOnConfirm) onClose?.();
  };

  return (
    <ModalDialogRoot
      open={isOpen}
      onOpenChange={(open) => !open && !isConfirming && onClose?.()}
    >
      <ModalDialogContent
        className="overflow-hidden border border-amber-200/80 bg-white p-0 shadow-xl"
        overlayClassName={overlayClassName}
        onClose={isConfirming ? undefined : onClose}
      >
        <div className="border-b border-amber-100/80 bg-gradient-to-b from-amber-50/90 to-white px-6 pb-4 pt-6 pr-12">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={22} className="h-5 w-5" />
            </span>
            <ModalDialogTitle className="pt-1.5 text-[1.05rem] font-semibold leading-snug text-gray-900">
              {title || 'Confirm Action'}
            </ModalDialogTitle>
          </div>
        </div>
        <div className="px-6 py-4">
          <ModalDialogDescription className="text-[0.9375rem] leading-relaxed text-gray-600">
            {message}
          </ModalDialogDescription>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="ghost"
            onPress={onClose}
            isDisabled={isConfirming}
            className="flex-1 rounded-xl bg-gray-100 py-3 font-semibold text-gray-800 hover:bg-gray-200"
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onPress={handleConfirm}
            isDisabled={isConfirming}
            isLoading={isConfirming}
            className={`flex-1 rounded-xl py-3 font-semibold ${BRAND_PRIMARY_BTN}`}
          >
            {confirmText}
          </Button>
        </div>
      </ModalDialogContent>
    </ModalDialogRoot>
  );
}
