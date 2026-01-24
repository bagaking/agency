import React, { useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  CopyPlus,
  RotateCcw,
  Command,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Keyboard,
  Clipboard,
  Type,
} from 'lucide-react';

const scopeLabels = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

const formatScope = (value) => scopeLabels[value] || value;

const badgeClass = (variant) => {
  if (variant === 'warning') {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-200/70';
  }
  if (variant === 'primary') {
    return 'border-primary/30 bg-primary/5 text-primary';
  }
  return 'border-border/50 bg-muted/20 text-muted-foreground/60';
};

const ACTION_TYPE_OPTIONS = [
  {
    value: 'sendText',
    label: 'Send Text',
    description: 'Insert text into the terminal.',
    icon: Type,
  },
  {
    value: 'sendKeys',
    label: 'Send Keys',
    description: 'Send a key sequence (Enter, Escape).',
    icon: Keyboard,
  },
  {
    value: 'pasteFiles',
    label: 'Paste Files',
    description: 'Paste clipboard file paths.',
    icon: Clipboard,
  },
];

const KEY_LABELS = {
  ' ': 'Space',
  Escape: 'Escape',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Home: 'Home',
  End: 'End',
};

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const truncateText = (value, max = 48) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
};

const formatKeyName = (key) => {
  if (!key) {
    return '';
  }
  if (KEY_LABELS[key]) {
    return KEY_LABELS[key];
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
};

const formatShortcutFromEvent = (event) => {
  if (!event || event.isComposing || MODIFIER_KEYS.has(event.key)) {
    return '';
  }
  const keyName = formatKeyName(event.key);
  if (!keyName) {
    return '';
  }
  const parts = [];
  if (event.metaKey) {
    parts.push('Cmd');
  }
  if (event.ctrlKey) {
    parts.push('Ctrl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }
  parts.push(keyName);
  return parts.join('+');
};

const summarizeCommand = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  return truncateText(trimmed.split('\n')[0], 56);
};

const buildActionSummary = (action) => {
  const actionType = action?.type || 'sendText';
  if (actionType === 'sendKeys') {
    const keys = Array.isArray(action?.keys) ? action.keys.filter(Boolean).join(', ') : '';
    return keys ? `Send Keys - ${truncateText(keys, 36)}` : 'Send Keys';
  }
  if (actionType === 'pasteFiles') {
    return 'Paste Files - clipboard';
  }
  const text = action?.text ? truncateText(action.text, 36) : '';
  return text ? `Send Text - ${text}` : 'Send Text';
};

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

const getBindingsForProfile = (bindingsByProfile, profileId) => {
  if (!bindingsByProfile || !profileId) {
    return [];
  }
  if (typeof bindingsByProfile.get === 'function') {
    return bindingsByProfile.get(profileId) || [];
  }
  return bindingsByProfile[profileId] || [];
};

const buildBindingKey = (profileId, bindingId) => `${profileId}:${bindingId}`;

export function QuickActionsView({
  actions,
  bindingsByProfile = new Map(),
  activeProfileId,
  scope,
  scopeDisabled,
  scopePaths,
  error,
  dirty,
  saving,
  onAddAction,
  onRemoveAction,
  onOverrideAction,
  onResetAction,
  onUpdateAction,
  onSaveActions,
  onAddBinding,
  onRemoveBinding,
  onOverrideBinding,
  onResetBinding,
  onUpdateBinding,
  onClearError,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedBindingKey, setExpandedBindingKey] = useState(null);
  const [capturingBindingKey, setCapturingBindingKey] = useState(null);

  const scopeLabel = formatScope(scope);
  const scopeHint =
    scope === 'global'
      ? 'Global User Config'
      : scope === 'project'
        ? scopePaths?.project || 'Select a Cell to edit project Terminus.'
        : scopePaths?.agent || 'Select a Cell to edit agent Terminus.';

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Terminus</h2>
            <div className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass('primary')}`}>
                {scopeLabel} Scope
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
             <span className="text-[10px] font-bold uppercase text-muted-foreground/40 whitespace-nowrap">Source:</span>
             <span className="text-[11px] text-muted-foreground font-mono truncate opacity-60" title={scopeHint}>{scopeHint}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${dirty ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
            {dirty ? 'Unsaved Changes' : 'All Changes Saved'}
          </span>
          <button
            type="button"
            onClick={onAddAction}
            disabled={scopeDisabled}
            className={`inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50 ${focusRingClass}`}
          >
            <Plus size={14} aria-hidden="true" />
            New Profile
          </button>
          <button
            type="button"
            onClick={onSaveActions}
            disabled={saving || scopeDisabled || !dirty}
            className={`inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
          >
            <Save size={14} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <div
            className="mb-4 flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300"
            aria-live="polite"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
            {onClearError ? (
              <button
                type="button"
                onClick={onClearError}
                className={`ml-auto text-[10px] font-semibold uppercase tracking-widest text-rose-200/80 ${focusRingClass}`}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        )}

        {scopeDisabled && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80">
            <Info size={16} className="shrink-0" aria-hidden="true" />
            Select an agent in the sidebar to configure {scopeLabel} scoped Terminus.
          </div>
        )}

        <div className="grid gap-2">
          {actions && actions.length ? (
            actions.map((action) => {
              const meta = action.meta || {};
              const isLocal = Boolean(meta.isLocal);
              const isExpanded = expandedId === action.id;
              const isLocked = Boolean(action.locked);
              const isEditable = isLocal && !scopeDisabled;
              const profileBindings = getBindingsForProfile(bindingsByProfile, action.id);
              const isActiveProfile = activeProfileId === action.id;
              const startSummary = summarizeCommand(action.startCommand);
              const resumeSummary = summarizeCommand(action.resumeCommand);
              
              const inheritedFrom = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
              const overriddenBy = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
              const parentScope = meta.parentScope ? formatScope(meta.parentScope) : '';
              
              const resetLabel = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';

              return (
                <div
                  key={action.id}
                  className={`group rounded-lg border transition-[border-color,background-color] duration-200 ${
                    isExpanded ? 'border-primary/30 bg-card/40' : 'border-border bg-card/10 hover:border-border/80'
                  }`}
                >
                  {/* Header: Clickable to Expand */}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`terminus-action-${action.id}`}
                    className={`flex w-full items-center justify-between p-3 text-left ${isExpanded ? 'border-b border-border/50' : ''} ${focusRingClass}`}
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-1.5 rounded bg-muted/20 ${isLocal ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        <Command size={14} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className={`text-sm font-medium truncate ${isLocal ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {action.label || 'Unnamed Terminus'}
                        </span>
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-primary/60">Baseline</span>
                          ) : null}
                          {isActiveProfile ? (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-400/80">
                              Active
                            </span>
                          ) : null}
                          {!isLocal && (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/40">
                              Inherited from {inheritedFrom}
                            </span>
                          )}
                          {isLocal && parentScope && (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-primary/60">
                              Overrides {parentScope}
                            </span>
                          )}
                          {overriddenBy && (
                            <span className="text-[10px] font-bold uppercase tracking-tight text-amber-500/60">
                              Overridden by {overriddenBy}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground/50">
                          <span className="truncate">Start: {startSummary || 'none'}</span>
                          {resumeSummary ? <span className="truncate">Resume: {resumeSummary}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted-foreground/40" aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} className="text-muted-foreground/40" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                    {/* Content: Inputs */}
                    {isExpanded && (
                        <div id={`terminus-action-${action.id}`} className="p-4 space-y-4 animate-tab-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label
                                      htmlFor={`terminus-label-${action.id}`}
                                      className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
                                    >
                                      Profile Label
                                    </label>
                                    <input
                                        id={`terminus-label-${action.id}`}
                                        className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                                        value={action.label || ''}
                                        onChange={(e) => onUpdateAction(action.id, { label: e.target.value })}
                                        disabled={!isEditable}
                                        name={`terminus-label-${action.id}`}
                                        autoComplete="off"
                                        placeholder="e.g. Build Project…"
                                    />
                                </div>
                                <div className="flex items-end justify-end pb-0.5">
                                    {!isLocal ? (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onOverrideAction?.(action.id); }}
                                            disabled={scopeDisabled}
                                            className={`inline-flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 ${focusRingClass}`}
                                        >
                                            <CopyPlus size={14} aria-hidden="true" />
                                            Override to {scopeLabel}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); meta.hasParent && scope !== 'global' ? onResetAction?.(action.id) : onRemoveAction?.(action.id); }}
                                            disabled={isLocked}
                                            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold transition-colors ${focusRingClass} ${
                                              isLocked
                                                ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                                                : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5'
                                            }`}
                                        >
                                            {meta.hasParent && scope !== 'global' ? <RotateCcw size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                                            {resetLabel}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label
                                      htmlFor={`terminus-start-${action.id}`}
                                      className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
                                    >
                                      Start Command
                                    </label>
                                    <textarea
                                        id={`terminus-start-${action.id}`}
                                        className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary disabled:opacity-50 min-h-[60px] ${focusRingClass}`}
                                        value={action.startCommand || ''}
                                        onChange={(e) => onUpdateAction(action.id, { startCommand: e.target.value })}
                                        disabled={!isEditable}
                                        name={`terminus-start-${action.id}`}
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="Command to start a new session (e.g., npm run dev)…"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label
                                      htmlFor={`terminus-resume-${action.id}`}
                                      className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block"
                                    >
                                      Resume Command
                                    </label>
                                    <textarea
                                        id={`terminus-resume-${action.id}`}
                                        className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary disabled:opacity-50 min-h-[60px] ${focusRingClass}`}
                                        value={action.resumeCommand || ''}
                                        onChange={(e) => onUpdateAction(action.id, { resumeCommand: e.target.value })}
                                        disabled={!isEditable}
                                        name={`terminus-resume-${action.id}`}
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="Optional: command to run in an existing session…"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                  <Keyboard size={14} aria-hidden="true" />
                                  Shortcuts
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onAddBinding?.(action.id)}
                                  disabled={scopeDisabled}
                                  className={`inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50 ${focusRingClass}`}
                                >
                                  <Plus size={12} aria-hidden="true" />
                                  New Shortcut
                                </button>
                              </div>
                              <div className={`text-[11px] ${isActiveProfile ? 'text-emerald-400/80' : 'text-muted-foreground/60'}`}>
                                {isActiveProfile
                                  ? 'Active profile shortcuts apply to the current terminal session.'
                                  : 'Shortcuts apply when this profile is active.'}
                              </div>

                              <div className="grid gap-2">
                                {profileBindings && profileBindings.length ? (
                                  profileBindings.map((binding) => {
                                    const meta = binding.meta || {};
                                    const isBindingLocal = Boolean(meta.isLocal);
                                    const bindingKey = buildBindingKey(action.id, binding.id);
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
                                    const handleCaptureKeyDown = (event) => {
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
                                          onClick={() =>
                                            setExpandedBindingKey(isExpandedBinding ? null : bindingKey)
                                          }
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
                                  })
                                ) : (
                                  <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                                    No shortcuts configured for this profile.
                                  </div>
                                )}
                              </div>
                            </div>
                        </div>
                    )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
               <Command size={32} className="opacity-10 mb-2" aria-hidden="true" />
               <p className="text-sm">No Terminus configured for this scope.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
