import { create } from 'zustand';
import { markInstallPromptSeen } from '../lib/pwa/installPromptSeen';

const defaultAlert = {
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
};

function alertTitleForType(type) {
  if (type === 'success') return 'Success';
  if (type === 'error') return 'Error';
  if (type === 'warning') return 'Warning';
  return 'Info';
}

/**
 * UI-only ephemeral state. API/cart/auth remain in TanStack Query + Context.
 */
export const useUiStore = create(set => ({
  scrollNavVisible: true,
  setScrollNavVisible: scrollNavVisible => set({ scrollNavVisible }),

  alert: defaultAlert,
  showAlert: (message, title = null, type = 'info') =>
    set({
      alert: {
        isOpen: true,
        title: title || alertTitleForType(type),
        message,
        type,
      },
    }),
  hideAlert: () => set(state => ({ alert: { ...state.alert, isOpen: false } })),

  cartSidebarOpen: false,
  setCartSidebarOpen: cartSidebarOpen => set({ cartSidebarOpen }),
  openCartSidebar: () => set({ cartSidebarOpen: true }),
  closeCartSidebar: () => set({ cartSidebarOpen: false }),

  installPromptDismissed: false,
  dismissInstallPrompt: () => {
    markInstallPromptSeen();
    set({ installPromptDismissed: true });
  },

  deferredInstallPrompt: null,
  setDeferredInstallPrompt: deferredInstallPrompt => set({ deferredInstallPrompt }),
  clearDeferredInstallPrompt: () => set({ deferredInstallPrompt: null }),

  /**
   * App-level custom-weight sheet. Lives outside ProductCard so catalog/search
   * remounts cannot wipe open state mid-selection.
   * @type {null | { product: object, productName?: string, sizes?: array, onSelect?: Function }}
   */
  weightChooser: null,
  openWeightChooser: payload => {
    if (!payload?.product) return;
    set({ weightChooser: payload });
  },
  closeWeightChooser: () => set({ weightChooser: null }),
  setWeightChooserBusy: busy =>
    set(state =>
      state.weightChooser ? { weightChooser: { ...state.weightChooser, busy: !!busy } } : state
    ),
}));
