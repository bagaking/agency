import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, Mic, Command, RotateCcw, Check, Users, FolderOpen } from 'lucide-react';

const scopeLabels = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

const ACTION_ICONS = {
  'capture.screenshot': Camera,
  'memo.voice': Mic,
  'view.agents': Users,
  'view.explorer': FolderOpen,
};

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

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

const formatScopeLabel = (value) => scopeLabels[value] || value;

export function AppShortcutsView({
  actions,
  scope,
  scopeDisabled,
  scopePaths,
  error,
  dirty,
  saving,
  onUpdateAction,
  onOverrideAction,
  onResetAction,
  onSave,
  onClearError,
}) {
  const [selectedId, setSelectedId] = useState(actions?.[0]?.id || '');
  const [capturingId, setCapturingId] = useState('');

  useEffect(() => {
    if (actions?.length && !actions.find((action) => action.id === selectedId)) {
      setSelectedId(actions[0]?.id || '');
    }
  }, [actions, selectedId]);

  const selectedAction = useMemo(
    () => actions?.find((action) => action.id === selectedId) || null,
    [actions, selectedId]
  );

  const scopeLabel = formatScopeLabel(scope);
  const scopePath = scopePaths?.[scope] || '';
  const inheritedFromLabel = selectedAction?.meta?.inheritedFrom
    ? formatScopeLabel(selectedAction.meta.inheritedFrom)
    : '';
  const statusLabel = selectedAction?.meta?.isLocal
    ? `${scopeLabel} override`
    : inheritedFromLabel
      ? `Inherited from ${inheritedFromLabel}`
      : 'Inherited';

  const hasOverride = Boolean(selectedAction?.meta?.isLocal && scope !== 'global');

  const handleToggleEnabled = () => {
    if (!selectedAction) {
      return;
    }
    if (scopeDisabled) {
      return;
    }
    if (!selectedAction.meta?.isLocal && scope !== 'global') {
      onOverrideAction?.(selectedAction.id);
    }
    onUpdateAction?.(selectedAction.id, { enabled: !selectedAction.enabled });
  };

  const handleCaptureStart = () => {
    if (!selectedAction) {
      return;
    }
    if (scopeDisabled) {
      return;
    }
    setCapturingId(selectedAction.id);
  };

  const handleCaptureKeyDown = (event) => {
    if (!selectedAction) {
      return;
    }
    event.preventDefault();
    if (event.key === 'Escape') {
      setCapturingId('');
      return;
    }
    const shortcut = formatShortcutFromEvent(event);
    if (!shortcut) {
      return;
    }
    if (!selectedAction.meta?.isLocal && scope !== 'global') {
      onOverrideAction?.(selectedAction.id);
    }
    onUpdateAction?.(selectedAction.id, { shortcut });
    setCapturingId('');
  };

  const handleClearShortcut = () => {
    if (!selectedAction) {
      return;
    }
    if (scopeDisabled) {
      return;
    }
    if (!selectedAction.meta?.isLocal && scope !== 'global') {
      onOverrideAction?.(selectedAction.id);
    }
    onUpdateAction?.(selectedAction.id, { shortcut: '' });
  };

  const renderActionRow = (action) => {
    const Icon = ACTION_ICONS[action.id] || Command;
    const isSelected = action.id === selectedId;
    return (
      <button
        key={action.id}
        type="button"
        onClick={() => setSelectedId(action.id)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${focusRingClass} ${
          isSelected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-md border border-border/50 ${
          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/20 text-muted-foreground'
        }`}>
          <Icon size={16} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{action.label || action.id}</span>
            {action.meta?.isLocal ? (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                Custom
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-muted-foreground/60 truncate">
            {action.description}
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/70">
          {action.shortcut || 'Unassigned'}
        </div>
      </button>
    );
  };

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">App Shortcuts</h2>
            <div className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/30 bg-primary/5 text-primary">
              {scopeLabel} Scope
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/40 whitespace-nowrap">Source:</span>
            <span
              className="text-[11px] text-muted-foreground font-mono truncate opacity-60"
              title={scopePath}
            >
              {scopePath || 'Select a Cell to edit project or agent shortcuts.'}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              dirty ? 'text-amber-400/80' : 'text-emerald-400/80'
            }`}
          >
            {dirty ? 'Unsaved Changes' : 'All Changes Saved'}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || scopeDisabled || !dirty}
            className={`inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
          >
            <Check size={14} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-muted/10 p-3 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 pb-2">
            Actions
          </div>
          <div className="space-y-1">{actions?.map(renderActionRow)}</div>
        </aside>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          {selectedAction ? (
            <div className="max-w-2xl space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold text-foreground">{selectedAction.label}</div>
                  <div className="text-sm text-muted-foreground/70">{selectedAction.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Status
                  </div>
                  <div className="text-xs font-medium text-foreground">{statusLabel}</div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Enabled
                    </div>
                    <div className="text-sm text-foreground">Use this shortcut in the app.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleEnabled}
                    disabled={scopeDisabled}
                    role="switch"
                    aria-checked={selectedAction.enabled}
                    aria-label={`Toggle ${selectedAction.label || selectedAction.id} shortcut`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${focusRingClass} ${
                      selectedAction.enabled ? 'bg-primary/70 border-primary/60' : 'bg-muted/40 border-border'
                    } ${scopeDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        selectedAction.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Shortcut
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      disabled={scopeDisabled}
                      name={`app-shortcut-${selectedAction.id}`}
                      autoComplete="off"
                      aria-label="Shortcut key"
                      value={
                        capturingId === selectedAction.id
                          ? 'Press keys…'
                          : selectedAction.shortcut || 'Unassigned'
                      }
                      onFocus={handleCaptureStart}
                      onClick={handleCaptureStart}
                      onKeyDown={capturingId === selectedAction.id ? handleCaptureKeyDown : undefined}
                      onBlur={() => setCapturingId('')}
                      className={`w-full rounded-md border border-border bg-muted/10 px-3 py-2 text-sm font-mono text-foreground ${focusRingClass} ${
                        scopeDisabled ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleClearShortcut}
                      disabled={scopeDisabled || !selectedAction.shortcut}
                      className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 ${focusRingClass} ${
                        scopeDisabled ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">
                    Click the field and press a key combination. Press Escape to cancel.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="text-[11px] text-muted-foreground/70">
                    {hasOverride
                      ? 'This shortcut overrides a parent scope.'
                      : scope === 'global'
                        ? 'Global defaults apply to all cells.'
                        : 'Inherited from a parent scope.'}
                  </div>
                  {scope !== 'global' ? (
                    <button
                      type="button"
                      onClick={() => onResetAction?.(selectedAction.id)}
                      disabled={scopeDisabled || !selectedAction.meta?.isLocal}
                      className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 ${focusRingClass} ${
                        scopeDisabled || !selectedAction.meta?.isLocal ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <RotateCcw size={12} />
                      Reset to Inherited
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select an action to configure.</div>
          )}
        </div>
      </div>

      {error ? (
        <div
          className="border-t border-border px-6 py-3 text-xs text-rose-200 bg-rose-500/10 flex items-center justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className={`text-[10px] uppercase tracking-widest ${focusRingClass}`}
            onClick={onClearError}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </section>
  );
}
