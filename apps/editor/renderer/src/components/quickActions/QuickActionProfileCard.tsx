import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Command,
  CopyPlus,
  Keyboard,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { QuickActionBindingCard } from './QuickActionBindingCard';
import {
  buildBindingKey,
  focusRingClass,
  formatScope,
  getBindingsForProfile,
  summarizeCommand,
} from './quickActionsShared';

type QuickActionProfileCardProps = {
  action: any;
  bindingsByProfile?: any;
  activeProfileId?: string;
  scope: string;
  scopeLabel: string;
  scopeDisabled: boolean;
  expandedId: string | null;
  setExpandedId: (value: string | null) => void;
  expandedBindingKey: string | null;
  setExpandedBindingKey: (value: string | null) => void;
  capturingBindingKey: string | null;
  setCapturingBindingKey: (value: string | null) => void;
  onAddBinding?: (profileId: string) => void;
  onRemoveAction?: (actionId: string) => void;
  onOverrideAction?: (actionId: string) => void;
  onResetAction?: (actionId: string) => void;
  onUpdateAction?: (actionId: string, patch: any) => void;
  onRemoveBinding?: (actionId: string, bindingId: string) => void;
  onOverrideBinding?: (actionId: string, bindingId: string) => void;
  onResetBinding?: (actionId: string, bindingId: string) => void;
  onUpdateBinding?: (actionId: string, bindingId: string, patch: any) => void;
};

export function QuickActionProfileCard({
  action,
  bindingsByProfile = new Map(),
  activeProfileId,
  scope,
  scopeLabel,
  scopeDisabled,
  expandedId,
  setExpandedId,
  expandedBindingKey,
  setExpandedBindingKey,
  capturingBindingKey,
  setCapturingBindingKey,
  onAddBinding,
  onRemoveAction,
  onOverrideAction,
  onResetAction,
  onUpdateAction,
  onRemoveBinding,
  onOverrideBinding,
  onResetBinding,
  onUpdateBinding,
}: QuickActionProfileCardProps) {
  const meta = action.meta || {};
  const isLocal = Boolean(meta.isLocal);
  const isExpanded = expandedId === action.id;
  const isLocked = Boolean(action.locked);
  const isEditable = isLocal && !scopeDisabled;
  const profileBindings = getBindingsForProfile(bindingsByProfile, action.id);
  const isActiveProfile = activeProfileId === action.id;
  const startSummary = summarizeCommand(action.startCommand);
  const resumeSummary = summarizeCommand(action.resumeCommand);
  const forkConfig = {
    enabled: Boolean(action.fork?.enabled),
    driver: String(action.fork?.driver || '').trim(),
    launchTemplate: String(action.fork?.launchTemplate || '').trim(),
    sourceIdleMs: Number(action.fork?.sourceIdleMs) || 1500,
    forkAckTimeoutMs: Number(action.fork?.forkAckTimeoutMs) || 15000,
    childReadyTimeoutMs: Number(action.fork?.childReadyTimeoutMs) || 20000,
  };

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

      {isExpanded ? (
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
                onChange={(e) => onUpdateAction?.(action.id, { label: e.target.value })}
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
                onChange={(e) => onUpdateAction?.(action.id, { startCommand: e.target.value })}
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
                onChange={(e) => onUpdateAction?.(action.id, { resumeCommand: e.target.value })}
                disabled={!isEditable}
                name={`terminus-resume-${action.id}`}
                autoComplete="off"
                spellCheck={false}
                placeholder="Optional: command to run in an existing session…"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 bg-background/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Smart Fork
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground/60">
                  Host-orchestrated fork flow for tools like Codex.
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={forkConfig.enabled}
                  disabled={!isEditable}
                  onChange={(event) =>
                    onUpdateAction?.(action.id, {
                      fork: {
                        ...forkConfig,
                        enabled: event.target.checked,
                      },
                    })
                  }
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor={`terminus-fork-driver-${action.id}`}
                  className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Fork Driver
                </label>
                <input
                  id={`terminus-fork-driver-${action.id}`}
                  className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                  value={forkConfig.driver}
                  onChange={(event) =>
                    onUpdateAction?.(action.id, {
                      fork: {
                        ...forkConfig,
                        driver: event.target.value,
                      },
                    })
                  }
                  disabled={!isEditable}
                  placeholder="e.g. codex"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`terminus-fork-idle-${action.id}`}
                  className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Source Idle Ms
                </label>
                <input
                  id={`terminus-fork-idle-${action.id}`}
                  type="number"
                  min={0}
                  className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                  value={forkConfig.sourceIdleMs}
                  onChange={(event) =>
                    onUpdateAction?.(action.id, {
                      fork: {
                        ...forkConfig,
                        sourceIdleMs: Number(event.target.value) || 0,
                      },
                    })
                  }
                  disabled={!isEditable}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`terminus-fork-template-${action.id}`}
                className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
              >
                Launch Template
              </label>
              <textarea
                id={`terminus-fork-template-${action.id}`}
                className={`min-h-[60px] w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                value={forkConfig.launchTemplate}
                onChange={(event) =>
                  onUpdateAction?.(action.id, {
                    fork: {
                      ...forkConfig,
                      launchTemplate: event.target.value,
                    },
                  })
                }
                disabled={!isEditable}
                spellCheck={false}
                placeholder="e.g. codex --thread {thread_id}"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor={`terminus-fork-ack-${action.id}`}
                  className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Ack Timeout Ms
                </label>
                <input
                  id={`terminus-fork-ack-${action.id}`}
                  type="number"
                  min={0}
                  className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                  value={forkConfig.forkAckTimeoutMs}
                  onChange={(event) =>
                    onUpdateAction?.(action.id, {
                      fork: {
                        ...forkConfig,
                        forkAckTimeoutMs: Number(event.target.value) || 0,
                      },
                    })
                  }
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`terminus-fork-ready-${action.id}`}
                  className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
                >
                  Child Ready Ms
                </label>
                <input
                  id={`terminus-fork-ready-${action.id}`}
                  type="number"
                  min={0}
                  className={`w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary disabled:opacity-50 ${focusRingClass}`}
                  value={forkConfig.childReadyTimeoutMs}
                  onChange={(event) =>
                    onUpdateAction?.(action.id, {
                      fork: {
                        ...forkConfig,
                        childReadyTimeoutMs: Number(event.target.value) || 0,
                      },
                    })
                  }
                  disabled={!isEditable}
                />
              </div>
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
                profileBindings.map((binding: any) => (
                  <QuickActionBindingCard
                    key={buildBindingKey(action.id, binding.id)}
                    action={action}
                    binding={binding}
                    scope={scope}
                    scopeLabel={scopeLabel}
                    scopeDisabled={scopeDisabled}
                    expandedBindingKey={expandedBindingKey}
                    setExpandedBindingKey={setExpandedBindingKey}
                    capturingBindingKey={capturingBindingKey}
                    setCapturingBindingKey={setCapturingBindingKey}
                    onRemoveBinding={onRemoveBinding}
                    onOverrideBinding={onOverrideBinding}
                    onResetBinding={onResetBinding}
                    onUpdateBinding={onUpdateBinding}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  No shortcuts configured for this profile.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
