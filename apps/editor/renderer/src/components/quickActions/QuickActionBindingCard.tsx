import React from 'react';
import { ChevronDown, ChevronUp, CopyPlus, Keyboard, RotateCcw, Trash2 } from 'lucide-react';
import {
  ACTION_TYPE_OPTIONS,
  buildActionSummary,
  focusRingClass,
  formatScope,
  formatShortcutFromEvent,
} from './quickActionsShared';

type QuickActionBindingCardProps = {
  action: any;
  binding: any;
  scope: string;
  scopeLabel: string;
  scopeDisabled: boolean;
  expandedBindingKey: string | null;
  setExpandedBindingKey: (value: string | null) => void;
  capturingBindingKey: string | null;
  setCapturingBindingKey: (value: string | null) => void;
  onRemoveBinding?: (actionId: string, bindingId: string) => void;
  onOverrideBinding?: (actionId: string, bindingId: string) => void;
  onResetBinding?: (actionId: string, bindingId: string) => void;
  onUpdateBinding?: (actionId: string, bindingId: string, patch: any) => void;
};

export function QuickActionBindingCard({
  action,
  binding,
  scope,
  scopeLabel,
  scopeDisabled,
  expandedBindingKey,
  setExpandedBindingKey,
  capturingBindingKey,
  setCapturingBindingKey,
  onRemoveBinding,
  onOverrideBinding,
  onResetBinding,
  onUpdateBinding,
}: QuickActionBindingCardProps) {
  const meta = binding.meta || {};
  const isBindingLocal = Boolean(meta.isLocal);
  const bindingKey = `${action.id}:${binding.id}`;
  const isExpandedBinding = expandedBindingKey === bindingKey;
  const isEditableBinding = isBindingLocal && !scopeDisabled;
  const inheritedFromBinding = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
  const overriddenByBinding = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
  const parentScopeBinding = meta.parentScope ? formatScope(meta.parentScope) : '';
  const resetLabelBinding = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';
  const actionPayload = binding.action || {};
  const actionType = actionPayload.type || 'sendText';
  const keysValue = Array.isArray(actionPayload.keys) ? actionPayload.keys.join(', ') : '';
  const textValue = actionPayload.text || '';
  const actionSummary = buildActionSummary(actionPayload);
  const shortcutLabel = binding.key ? binding.key : 'Unassigned';
  const isCapturing = capturingBindingKey === bindingKey;
  const captureHintId = `shortcut-capture-${bindingKey.replace(/:/g, '-')}`;

  const handleCaptureKeyDown = (event: any) => {
    if (!isEditableBinding || !isCapturing) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      setCapturingBindingKey(null);
      return;
    }
    const captured = formatShortcutFromEvent(event);
    if (!captured) {
      return;
    }
    onUpdateBinding?.(action.id, binding.id, { key: captured });
    setCapturingBindingKey(null);
  };

  return (
    <div
      key={bindingKey}
      className={`group rounded-lg border transition-[border-color,background-color] duration-200 ${
        isExpandedBinding ? 'border-primary/30 bg-card/40' : 'border-border bg-card/10 hover:border-border/80'
      }`}
    >
      <button
        type="button"
        aria-expanded={isExpandedBinding}
        aria-controls={`terminus-binding-${bindingKey.replace(/:/g, '-')}`}
        className={`flex w-full items-center justify-between p-3 text-left ${isExpandedBinding ? 'border-b border-border/50' : ''} ${focusRingClass}`}
        onClick={() => setExpandedBindingKey(isExpandedBinding ? null : bindingKey)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-1.5 rounded bg-muted/20 ${isBindingLocal ? 'text-primary' : 'text-muted-foreground/40'}`}>
            <Keyboard size={14} aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-medium truncate ${isBindingLocal ? 'text-foreground' : 'text-muted-foreground/60'}`}>
              {binding.label || 'Unnamed Shortcut'}
            </span>
            <div className="flex items-center gap-2">
              {!isBindingLocal && (
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/40">
                  Inherited from {inheritedFromBinding}
                </span>
              )}
              {isBindingLocal && parentScopeBinding && (
                <span className="text-[10px] font-bold uppercase tracking-tight text-primary/60">
                  Overrides {parentScopeBinding}
                </span>
              )}
              {overriddenByBinding && (
                <span className="text-[10px] font-bold uppercase tracking-tight text-amber-500/60">
                  Overridden by {overriddenByBinding}
                </span>
              )}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground/60">
              <span className="rounded border border-border/50 bg-muted/20 px-2 py-0.5 font-mono text-[10px]">
                {shortcutLabel}
              </span>
              <span className="truncate">{actionSummary}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpandedBinding ? (
            <ChevronUp size={14} className="text-muted-foreground/40" aria-hidden="true" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpandedBinding && (
        <div id={`terminus-binding-${bindingKey.replace(/:/g, '-')}`} className="p-4 space-y-4 animate-tab-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`terminus-shortcut-label-${bindingKey.replace(/:/g, '-')}`}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
              >
                Shortcut Label
              </label>
              <input
                id={`terminus-shortcut-label-${bindingKey.replace(/:/g, '-')}`}
                className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                value={binding.label || ''}
                onChange={(e) => onUpdateBinding?.(action.id, binding.id, { label: e.target.value })}
                disabled={!isEditableBinding}
                name={`terminus-shortcut-label-${bindingKey.replace(/:/g, '-')}`}
                autoComplete="off"
                placeholder="e.g. Run in Agent…"
              />
            </div>
            <div className="flex items-end justify-end pb-0.5">
              {!isBindingLocal ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOverrideBinding?.(action.id, binding.id);
                  }}
                  disabled={scopeDisabled}
                  className={`inline-flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 ${focusRingClass}`}
                >
                  <CopyPlus size={14} aria-hidden="true" />
                  Override to {scopeLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    meta.hasParent && scope !== 'global'
                      ? onResetBinding?.(action.id, binding.id)
                      : onRemoveBinding?.(action.id, binding.id);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold transition-colors ${focusRingClass} ${
                    scopeDisabled
                      ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                      : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5'
                  }`}
                  disabled={scopeDisabled}
                >
                  {meta.hasParent && scope !== 'global' ? <RotateCcw size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                  {resetLabelBinding}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                id={`terminus-shortcut-key-label-${bindingKey.replace(/:/g, '-')}`}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
              >
                Shortcut Key
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isEditableBinding) {
                      return;
                    }
                    setCapturingBindingKey(bindingKey);
                  }}
                  onKeyDown={handleCaptureKeyDown}
                  aria-describedby={captureHintId}
                  aria-labelledby={`terminus-shortcut-key-label-${bindingKey.replace(/:/g, '-')}`}
                  className={`flex items-center justify-between rounded border border-border/50 bg-background/50 px-3 py-2 text-[11px] font-mono transition-colors ${focusRingClass} ${
                    isEditableBinding
                      ? 'hover:border-primary/40'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span>{isCapturing ? 'Press keys…' : shortcutLabel}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Capture</span>
                </button>
                <p id={captureHintId} className="text-[10px] text-muted-foreground/50">
                  Click and press a key combo. Press Escape to cancel.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                id={`terminus-shortcut-type-label-${bindingKey.replace(/:/g, '-')}`}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
              >
                Action Type
              </label>
              <div
                className="grid grid-cols-1 gap-2"
                role="group"
                aria-labelledby={`terminus-shortcut-type-label-${bindingKey.replace(/:/g, '-')}`}
              >
                {ACTION_TYPE_OPTIONS.map((option) => {
                  const isSelected = actionType === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onUpdateBinding?.(action.id, binding.id, {
                          action: {
                            ...(binding.action || {}),
                            type: option.value,
                          },
                        })
                      }
                      disabled={!isEditableBinding}
                      className={`group flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${focusRingClass} ${
                        isSelected
                          ? 'border-primary/40 bg-primary/5 text-foreground'
                          : 'border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30'
                      } ${!isEditableBinding ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border ${
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/50 bg-muted/30 text-muted-foreground/70'
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-[12px] font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {actionType === 'sendText' ? (
            <div className="space-y-1.5">
              <label
                htmlFor={`terminus-shortcut-text-${bindingKey.replace(/:/g, '-')}`}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
              >
                Text Payload
              </label>
              <textarea
                id={`terminus-shortcut-text-${bindingKey.replace(/:/g, '-')}`}
                className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary disabled:opacity-50 min-h-[70px] ${focusRingClass}`}
                value={textValue}
                onChange={(e) =>
                  onUpdateBinding?.(action.id, binding.id, {
                    action: {
                      ...(binding.action || {}),
                      text: e.target.value,
                    },
                  })
                }
                disabled={!isEditableBinding}
                name={`terminus-shortcut-text-${bindingKey.replace(/:/g, '-')}`}
                autoComplete="off"
                spellCheck={false}
                placeholder="Text to send to the terminal…"
              />
            </div>
          ) : null}

          {actionType === 'sendKeys' ? (
            <div className="space-y-1.5">
              <label
                htmlFor={`terminus-shortcut-keys-${bindingKey.replace(/:/g, '-')}`}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
              >
                Key Sequence
              </label>
              <input
                id={`terminus-shortcut-keys-${bindingKey.replace(/:/g, '-')}`}
                className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                value={keysValue}
                onChange={(e) =>
                  onUpdateBinding?.(action.id, binding.id, {
                    action: {
                      ...(binding.action || {}),
                      keys: e.target.value
                        .split(',')
                        .map((key) => key.trim())
                        .filter(Boolean),
                    },
                  })
                }
                disabled={!isEditableBinding}
                name={`terminus-shortcut-keys-${bindingKey.replace(/:/g, '-')}`}
                autoComplete="off"
                placeholder="Enter, Escape (comma-separated)…"
              />
            </div>
          ) : null}

          {actionType === 'pasteFiles' ? (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground/70">
              File paths will be pasted from the clipboard with safe quoting.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

