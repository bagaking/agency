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
    shell: 'border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.1),transparent_52%),linear-gradient(180deg,rgba(28,34,43,0.98),rgba(18,22,30,0.99))]',
    iconShell: 'bg-cyan-400/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.12)]',
    eyebrow: 'text-cyan-100/44',
    title: 'text-white',
    body: 'text-white/62',
    primaryButton: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
    secondaryButton: 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
    closeButton: 'text-white/34 hover:bg-white/[0.05] hover:text-white/78',
  },
  success: {
    shell: 'border-emerald-300/16 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.1),transparent_52%),linear-gradient(180deg,rgba(28,34,43,0.98),rgba(18,22,30,0.99))]',
    iconShell: 'bg-emerald-400/10 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.12)]',
    eyebrow: 'text-emerald-100/44',
    title: 'text-white',
    body: 'text-white/62',
    primaryButton: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200',
    secondaryButton: 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
    closeButton: 'text-white/34 hover:bg-white/[0.05] hover:text-white/78',
  },
  warning: {
    shell: 'border-amber-300/18 bg-[radial-gradient(circle_at_top_left,rgba(253,224,71,0.1),transparent_52%),linear-gradient(180deg,rgba(30,28,24,0.98),rgba(21,19,16,0.99))]',
    iconShell: 'bg-amber-400/10 text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.14)]',
    eyebrow: 'text-amber-100/48',
    title: 'text-white',
    body: 'text-white/64',
    primaryButton: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
    secondaryButton: 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
    closeButton: 'text-white/34 hover:bg-white/[0.05] hover:text-white/78',
  },
  danger: {
    shell: 'border-rose-300/18 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.11),transparent_52%),linear-gradient(180deg,rgba(32,24,28,0.98),rgba(22,17,20,0.99))]',
    iconShell: 'bg-rose-400/10 text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.14)]',
    eyebrow: 'text-rose-100/48',
    title: 'text-white',
    body: 'text-white/64',
    primaryButton: 'bg-rose-500 text-white hover:bg-rose-400',
    secondaryButton: 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
    closeButton: 'text-white/34 hover:bg-white/[0.05] hover:text-white/78',
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

  if (variant === 'commander-task') {
    return <div className="animate-tab-in">{content}</div>;
  }

  return (
    <div className="relative w-full max-w-[42rem] animate-tab-in" data-testid={id}>
      <div
        className={`relative overflow-hidden rounded-[28px] border shadow-[0_32px_96px_rgba(0,0,0,0.42)] ring-1 ring-black/35 ${styles.shell}`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_32%)]" />
        <div className="relative px-7 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${styles.iconShell}`}
          >
            <Icon size={21} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showLabel ? (
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.34em] ${styles.eyebrow}`}>
                    {resolveVariantLabel(variant)}
                  </div>
                ) : null}
                <div className={`mt-2 text-[18px] font-semibold tracking-[-0.02em] ${styles.title}`}>{title}</div>
              </div>
              <button
                type="button"
                onClick={() => onClose(id, resolveDismissResult(modal))}
                className={`mt-0.5 rounded-full p-2 transition-colors ${styles.closeButton}`}
                aria-label="Close modal"
              >
                <X size={14} />
              </button>
            </div>
            {description ? (
              <div className={`max-h-[50vh] overflow-y-auto whitespace-pre-wrap pr-1 text-[14px] leading-7 ${styles.body}`}>
                {description}
              </div>
            ) : null}
            {content ? (
              <div className="pt-4">
                {content}
              </div>
            ) : null}
            {isPrompt ? (
              <div className="pt-4">
                {modal?.inputLabel ? (
                  <label className={`mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.eyebrow}`}>
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
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-[13px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-colors placeholder:text-white/24 focus:border-white/18"
                />
                {promptError ? (
                  <div className="mt-2 text-[10px] text-rose-200">{promptError}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          </div>
        {showCancel || showDismiss ? (
          <div className="relative mt-6 flex items-center justify-end gap-2">
            {showCancel ? (
              <button
                type="button"
                onClick={() => onClose(id, resolveDismissResult(modal))}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${styles.secondaryButton}`}
              >
                {cancelLabel}
              </button>
            ) : null}
            {showDismiss ? (
              <button
                type="button"
                onClick={() => onClose(id, true)}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.45)] ${styles.primaryButton}`}
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
                className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.45)] ${styles.primaryButton}`}
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
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

  const dismissOnOverlay =
    modal.dismissOnOverlay ?? (modal.variant !== 'confirm' && modal.variant !== 'commander-task');

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
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(22,28,38,0.2),rgba(6,8,12,0.78))] backdrop-blur-[12px]"
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
