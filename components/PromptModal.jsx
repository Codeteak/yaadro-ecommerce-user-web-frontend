'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { AlertRegular as AlertCircle } from './icons';
import {
  ModalDialogRoot,
  ModalDialogContent,
  ModalDialogTitle,
  ModalDialogDescription,
} from './ui/ModalDialog';

export default function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = 'Enter value',
  submitText = 'Submit',
  cancelText = 'Cancel',
  defaultValue = '',
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setValue(defaultValue);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultValue]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value);
      onClose?.();
      setValue('');
    }
  };

  return (
    <ModalDialogRoot open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <ModalDialogContent className="border-2 border-blue-200 p-0" onClose={onClose}>
        <div className="flex items-center gap-3 p-6 pb-4 pr-12">
          <AlertCircle size={24} className="w-6 h-6 text-blue-600" />
          <ModalDialogTitle>{title || 'Input Required'}</ModalDialogTitle>
        </div>
        <div className="px-6 pb-6">
          <ModalDialogDescription className="mb-4">{message}</ModalDialogDescription>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
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
            onPress={handleSubmit}
            isDisabled={!value.trim()}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            {submitText}
          </Button>
        </div>
      </ModalDialogContent>
    </ModalDialogRoot>
  );
}
