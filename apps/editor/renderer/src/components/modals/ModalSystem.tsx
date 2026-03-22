import React, { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

const ModalContext = createContext(null);

const buildId = () =>
  `modal-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;

const toneStyles = {
  info: {
    ring: 'ring-sky-500/30',
    glow: 'bg-sky-500/10',
    icon: 'text-sky-300',
    button: 'bg-sky-500 text-slate-950 hover:bg-sky-400',
  },
  success: {
    ring: 'ring-emerald-500/30',
    glow: 'bg-emerald-500/10',
    icon: 'text-emerald-300',
    button: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  },
  warning: {
    ring: 'ring-amber-500/30',
    glow: 'bg-amber-500/10',
    icon: 'text-amber-300',
    button: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
  },
  danger: {
    ring: 'ring-rose-500/30',
    glow: 'bg-rose-500/10',
    icon: 'text-rose-300',
    button: 'bg-rose-500 text-white hover:bg-rose-400',
  },
};

const defaultIcons = {
  notice: Bell,
  alert: Info,
  floating: Info,
  confirm: AlertTriangle,
  prompt: Info,
  success: CheckCircle2,
};

function resolveDismissResult(modal) {
  if (modal?.variant === 'prompt') {
    return null;
  }
  return false;
}

function normalizePromptValue(modal, value) {
  const raw = String(value ?? '');
  if (typeof modal?.normalizeValue === 'function') {
    return modal.normalizeValue(raw);
  }
  return raw;
}

function resolveTone(tone) {
  return toneStyles[tone] || toneStyles.info;
}

function resolveVariantLabel(variant) {
  if (variant === 'confirm') {
    return 'Confirm';
  }
  if (variant === 'notice') {
    return 'Notice';
  }
  if (variant === 'prompt') {
    return 'Prompt';
  }
  return 'Alert';
}

function ModalCard({ modal, onClose }: any) {
  const {
    id,
    title,
    description,
    content,
    variant = 'confirm',
    tone = 'info',
    icon: IconOverride,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    dismissLabel = 'OK',
    showActions = true,
    showVariantLabel,
  } = modal;
  const [promptValue, setPromptValue] = useState(() => String(modal?.defaultValue ?? ''));
  const [promptError, setPromptError] = useState('');
  const styles = resolveTone(tone);
  const Icon = IconOverride || defaultIcons[variant] || AlertTriangle;
  const isFloating = variant === 'floating';
  const isPrompt = variant === 'prompt';
  const showCancel = showActions && (variant === 'confirm' || isPrompt);
  const showDismiss = showActions && (variant === 'notice' || variant === 'alert' || variant === 'floating');
  const showLabel = showVariantLabel ?? !isFloating;

  useEffect(() => {
    setPromptValue(String(modal?.defaultValue ?? ''));
    setPromptError('');
  }, [modal?.defaultValue, id]);

  const submitPrompt = useCallback(() => {
    const nextValue = normalizePromptValue(modal, promptValue);
    const validationMessage =
      typeof modal?.validateValue === 'function' ? modal.validateValue(nextValue) : '';
    if (validationMessage) {
      setPromptError(String(validationMessage));
      return;
    }
    onClose(id, nextValue);
  }, [id, modal, onClose, promptValue]);

  const handlePromptKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }
      event.preventDefault();
      submitPrompt();
    },
    [submitPrompt]
  );

  return (
    <div className="relative w-full max-w-md animate-tab-in" data-testid={id}>
      <div className="absolute -top-8 right-6 h-20 w-20 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-emerald-500/15 blur-3xl" />
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/40 bg-card/95 px-6 py-5 shadow-[0_25px_60px_rgba(0,0,0,0.45)] ring-1 ${styles.ring}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
        <div className="relative flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/40 ${styles.glow}`}
          >
            <Icon size={20} className={styles.icon} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                {showLabel ? (
                  <div className="text-[12px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                    {resolveVariantLabel(variant)}
                  </div>
                ) : null}
                <div className="mt-1 text-[15px] font-semibold text-foreground">{title}</div>
              </div>
              <button
                type="button"
                onClick={() => onClose(id, resolveDismissResult(modal))}
                className="rounded-full border border-border/40 p-1 text-muted-foreground/70 hover:text-foreground hover:border-primary/40 transition-colors"
                aria-label="Close modal"
              >
                <X size={14} />
              </button>
            </div>
            {description ? (
              <div className="text-[12px] leading-relaxed text-muted-foreground/80 whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-1">
                {description}
              </div>
            ) : null}
            {content ? (
              <div className="pt-3">
                {content}
              </div>
            ) : null}
            {isPrompt ? (
              <div className="pt-3">
                {modal?.inputLabel ? (
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                    {modal.inputLabel}
                  </label>
                ) : null}
                <input
                  autoFocus
                  type={modal?.inputType || 'text'}
                  value={promptValue}
                  placeholder={modal?.placeholder || ''}
                  onChange={(event) => {
                    setPromptValue(event.target.value);
                    if (promptError) {
                      setPromptError('');
                    }
                  }}
                  onKeyDown={handlePromptKeyDown}
                  className="w-full rounded-xl border border-border/40 bg-background/80 px-3 py-2 text-[12px] text-foreground shadow-inner outline-none transition-colors placeholder:text-muted-foreground/35 focus:border-primary/40"
                />
                {promptError ? (
                  <div className="mt-2 text-[10px] text-rose-300">{promptError}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {showCancel || showDismiss ? (
          <div className="relative mt-5 flex items-center justify-end gap-2">
            {showCancel ? (
              <button
                type="button"
                onClick={() => onClose(id, resolveDismissResult(modal))}
                className="rounded-xl border border-border/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              >
                {cancelLabel}
              </button>
            ) : null}
            {showDismiss ? (
              <button
                type="button"
                onClick={() => onClose(id, true)}
                className={`rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${styles.button}`}
              >
                {dismissLabel}
              </button>
            ) : null}
            {showCancel ? (
              <button
                type="button"
                onClick={() => {
                  if (isPrompt) {
                    submitPrompt();
                    return;
                  }
                  onClose(id, true);
                }}
                className={`rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${styles.button}`}
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ModalHost({ stack, onClose }: any) {
  const modal = stack[stack.length - 1];
  const floatingRef = useRef(null);
  const isFloating = modal?.variant === 'floating';

  useEffect(() => {
    if (!modal?.autoCloseMs) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onClose(modal.id, true);
    }, modal.autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [modal, onClose]);

  useEffect(() => {
    if (!modal || !isFloating) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (floatingRef.current && floatingRef.current.contains(event.target)) {
        return;
      }
      window.setTimeout(() => {
        onClose(modal.id, false);
      }, 0);
    };
    const handleKeyDown = (event) => {
      const target = event.target;
      if (floatingRef.current && target && floatingRef.current.contains(target)) {
        return;
      }
      window.setTimeout(() => {
        onClose(modal.id, false);
      }, 0);
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isFloating, modal, onClose]);

  if (!modal || typeof document === 'undefined') {
    return null;
  }

  const dismissOnOverlay = modal.dismissOnOverlay ?? modal.variant !== 'confirm';

  if (isFloating) {
    return createPortal(
      <div className="fixed right-6 top-20 z-[9999] pointer-events-none">
        <div ref={floatingRef} className="pointer-events-auto">
          <ModalCard modal={modal} onClose={onClose} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
        onClick={() => {
          if (dismissOnOverlay) {
            onClose(modal.id, resolveDismissResult(modal));
          }
        }}
      />
      <div className="relative z-10 pointer-events-auto">
        <ModalCard modal={modal} onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}

export function ModalProvider({ children }: any) {
  const [stack, setStack] = useState([]);

  const closeModal = useCallback((id, result) => {
    setStack((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.resolve) {
        target.resolve(result);
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const openModal = useCallback(
    (config) =>
      new Promise((resolve) => {
        const id = config.id || buildId();
        setStack((current) => [
          ...current,
          {
            ...config,
            id,
            resolve,
          },
        ]);
      }),
    []
  );

  const confirm = useCallback(
    (config) =>
      openModal({
        variant: 'confirm',
        ...config,
      }),
    [openModal]
  );

  const notify = useCallback(
    (config) =>
      openModal({
        variant: 'notice',
        autoCloseMs: 2000,
        ...config,
      }),
    [openModal]
  );

  const prompt = useCallback(
    (config) =>
      openModal({
        variant: 'prompt',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        ...config,
      }),
    [openModal]
  );

  const value = useMemo(
    () => ({
      openModal,
      confirm,
      notify,
      prompt,
      closeModal,
    }),
    [closeModal, confirm, notify, openModal, prompt]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalHost stack={stack} onClose={closeModal} />
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
