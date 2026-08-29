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

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="w-6 h-6 text-primary" />;
      case 'error':
        return <AlertCircle size={24} className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle size={24} className="w-6 h-6 text-orange-600" />;
      default:
        return <Info size={24} className="w-6 h-6 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-primary/10 border-primary/30';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return BRAND_PRIMARY_BTN;
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <ModalDialogRoot open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <ModalDialogContent
        className={`border-2 p-0 ${getBgColor()}`}
        onClose={onClose}
        showClose
      >
        <div className="flex items-center gap-3 p-6 pb-4 pr-12">
          {getIcon()}
          <ModalDialogTitle>{title || 'Notification'}</ModalDialogTitle>
        </div>
        <div className="px-6 pb-6">
          <ModalDialogDescription>{message}</ModalDialogDescription>
        </div>
        <div className="px-6 pb-6">
          <Button
            variant="primary"
            onPress={onClose}
            className={`w-full py-3 rounded-lg font-semibold ${getButtonColor()}`}
          >
            OK
          </Button>
        </div>
      </ModalDialogContent>
    </ModalDialogRoot>
  );
}
