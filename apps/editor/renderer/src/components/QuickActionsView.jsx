import React from 'react';
import { Plus, Save, Trash2, CopyPlus, RotateCcw } from 'lucide-react';

const scopeLabels = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

const formatScope = (value) => scopeLabels[value] || value;

const badgeClass = (variant) => {
  if (variant === 'warning') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  }
  if (variant === 'primary') {
    return 'border-primary/40 bg-primary/10 text-primary';
  }
  return 'border-border bg-muted/40 text-muted-foreground';
};

export function QuickActionsView({
  actions,
  scope,
  scopeDisabled,
  scopePaths,
  error,
  saving,
  onAddAction,
  onRemoveAction,
  onOverrideAction,
  onResetAction,
  onUpdateAction,
  onSaveActions,
}) {
  const scopeLabel = formatScope(scope);
  const scopeHint =
    scope === 'global'
      ? 'User scope'
      : scope === 'project'
        ? scopePaths?.project || 'Select a Cell to edit project actions.'
        : scopePaths?.agent || 'Select a Cell to edit agent actions.';
  const disabledHint = scopeDisabled ? 'Select a Cell to edit this scope.' : '';

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Actions - {scopeLabel}</h2>
          <p className="text-xs text-muted-foreground">
            Configure start/resume commands. Actions resolve by scope.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Path: <span className="font-semibold text-foreground">{scopeHint}</span>
          </p>
          {disabledHint ? (
            <p className="mt-1 text-[11px] text-amber-200">{disabledHint}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddAction}
            disabled={scopeDisabled}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            type="button"
            onClick={onSaveActions}
            disabled={saving || scopeDisabled}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error ? (
          <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        ) : null}
        <div className="space-y-4">
          {actions && actions.length ? (
            actions.map((action) => {
              const meta = action.meta || {};
              const isLocal = Boolean(meta.isLocal);
              const isEditable = isLocal && !scopeDisabled;
              const inheritedFrom = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
              const overriddenBy = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
              const parentScope = meta.parentScope ? formatScope(meta.parentScope) : '';
              const primaryLabel = isLocal
                ? parentScope
                  ? `Overrides ${parentScope}`
                  : `${scopeLabel} action`
                : `Inherited from ${inheritedFrom}`;
              const resetLabel = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';
              return (
                <div key={action.id} className="rounded-lg border border-border bg-card/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-medium text-muted-foreground">Label</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeClass(
                              isLocal ? 'primary' : 'muted'
                            )}`}
                          >
                            {primaryLabel}
                          </span>
                          {overriddenBy ? (
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeClass('warning')}`}>
                              Overridden by {overriddenBy}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <input
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        value={action.label || ''}
                        onChange={(event) => onUpdateAction(action.id, { label: event.target.value })}
                        disabled={!isEditable}
                      />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Start Command / Script</label>
                        <textarea
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono disabled:cursor-not-allowed disabled:opacity-60"
                          rows={3}
                          value={action.startCommand || ''}
                          onChange={(event) =>
                            onUpdateAction(action.id, { startCommand: event.target.value })
                          }
                          disabled={!isEditable}
                          placeholder="Example: make codex-local"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Resume Command / Script</label>
                        <textarea
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono disabled:cursor-not-allowed disabled:opacity-60"
                          rows={2}
                          value={action.resumeCommand || ''}
                          onChange={(event) =>
                            onUpdateAction(action.id, { resumeCommand: event.target.value })
                          }
                          disabled={!isEditable}
                          placeholder="Optional. Leave empty if not supported."
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!isLocal ? (
                        <button
                          type="button"
                          onClick={() => onOverrideAction?.(action.id)}
                          disabled={scopeDisabled}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CopyPlus size={12} />
                          Override
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => (meta.hasParent && scope !== 'global' ? onResetAction?.(action.id) : onRemoveAction?.(action.id))}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                          title={resetLabel}
                        >
                          {meta.hasParent && scope !== 'global' ? <RotateCcw size={12} /> : <Trash2 size={12} />}
                          {resetLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">No actions configured.</div>
          )}
        </div>
      </div>
    </section>
  );
}
