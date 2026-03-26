import { useEffect, type RefObject } from 'react';

type DismissibleLayerOptions = {
  open: boolean;
  onDismiss: () => void;
  refs: Array<RefObject<HTMLElement | null>>;
  closeOnEscape?: boolean;
  closeOnFocusOutside?: boolean;
};

const isTargetInsideLayer = (
  refs: Array<RefObject<HTMLElement | null>>,
  target: EventTarget | null
) => {
  if (!(target instanceof Node)) {
    return false;
  }
  return refs.some((ref) => ref.current?.contains(target));
};

export function useDismissibleLayer({
  open,
  onDismiss,
  refs,
  closeOnEscape = true,
  closeOnFocusOutside = true,
}: DismissibleLayerOptions) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isTargetInsideLayer(refs, event.target)) {
        return;
      }
      onDismiss();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!closeOnFocusOutside || isTargetInsideLayer(refs, event.target)) {
        return;
      }
      onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, closeOnFocusOutside, onDismiss, open, refs]);
}
