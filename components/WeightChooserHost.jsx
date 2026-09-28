'use client';

import { useCallback } from 'react';
import CustomWeightChooser from './CustomWeightChooser';
import { useUiStore } from '../stores/uiStore';

/**
 * Single layout-mounted host for the custom-weight sheet.
 * Product cards / PDP / wishlist only call openWeightChooser() — they do not
 * own Dialog state (which remounts wiped when search/carousel/catalog refreshed).
 */
export default function WeightChooserHost() {
  const weightChooser = useUiStore(s => s.weightChooser);
  const closeWeightChooser = useUiStore(s => s.closeWeightChooser);
  const setWeightChooserBusy = useUiStore(s => s.setWeightChooserBusy);

  const handleOpenChange = useCallback(
    nextOpen => {
      if (!nextOpen) closeWeightChooser();
    },
    [closeWeightChooser]
  );

  const handleSelect = useCallback(
    async size => {
      const onSelect = weightChooser?.onSelect;
      if (!onSelect) {
        closeWeightChooser();
        return;
      }
      setWeightChooserBusy(true);
      try {
        await onSelect(size);
        closeWeightChooser();
      } catch {
        /* caller surfaces errors */
      } finally {
        setWeightChooserBusy(false);
      }
    },
    [weightChooser?.onSelect, closeWeightChooser, setWeightChooserBusy]
  );

  return (
    <CustomWeightChooser
      open={Boolean(weightChooser?.product)}
      onOpenChange={handleOpenChange}
      product={weightChooser?.product ?? null}
      productName={weightChooser?.productName ?? ''}
      sizes={weightChooser?.sizes ?? []}
      initialPackCount={weightChooser?.initialPackCount ?? null}
      busy={Boolean(weightChooser?.busy)}
      onSelect={handleSelect}
    />
  );
}
