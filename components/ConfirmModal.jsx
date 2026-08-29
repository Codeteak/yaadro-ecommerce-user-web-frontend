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

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  overlayClassName = 'z-50',
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
    onConfirm?.();
    onClose?.();
  };

  return (
    <ModalDialogRoot open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <ModalDialogContent
        className="border-2 border-orange-200 p-0"
        overlayClassName={overlayClassName}
        onClose={onClose}
      >
        <div className="flex items-center gap-3 p-6 pb-4 pr-12">
          <AlertTriangle size={24} className="w-6 h-6 text-orange-600" />
          <ModalDialogTitle>{title || 'Confirm Action'}</ModalDialogTitle>
        </div>
        <div className="px-6 pb-6">
          <ModalDialogDescription>{message}</ModalDialogDescription>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="ghost"
            onPress={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onPress={handleConfirm}
            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700"
          >
            {confirmText}
          </Button>
        </div>
      </ModalDialogContent>
    </ModalDialogRoot>
  );
}
