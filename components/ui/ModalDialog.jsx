'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { CloseRegular as X } from '../icons';

export function ModalDialogOverlay({ className = 'z-50', ...props }) {
  return (
    <Dialog.Overlay
      className={`fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out ${className}`}
      {...props}
    />
  );
}

export function ModalDialogContent({
  children,
  className = '',
  overlayClassName = 'z-50',
  showClose = true,
  onClose,
  ...props
}) {
  return (
    <Dialog.Portal>
      <ModalDialogOverlay className={overlayClassName} />
      <Dialog.Content
        className={`fixed left-1/2 top-1/2 z-[51] w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl outline-none ${className}`}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
        {...props}
      >
        {showClose ? (
          <Dialog.Close
            className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} className="h-5 w-5" />
          </Dialog.Close>
        ) : null}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ModalDialogTitle({ children, className = '' }) {
  return (
    <Dialog.Title className={`text-lg font-bold text-gray-900 ${className}`}>
      {children}
    </Dialog.Title>
  );
}

export function ModalDialogDescription({ children, className = '' }) {
  return (
    <Dialog.Description className={`text-gray-700 leading-relaxed ${className}`}>
      {children}
    </Dialog.Description>
  );
}

export const ModalDialogRoot = Dialog.Root;
