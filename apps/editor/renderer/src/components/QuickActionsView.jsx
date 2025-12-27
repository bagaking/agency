import React from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

export function QuickActionsView({
  actions,
  scope,
  canUseProjectScope,
  projectPath,
  error,
  saving,
  onAddAction,
  onRemoveAction,
  onUpdateAction,
  onSaveActions,
  onScopeChange,
}) {
  const scopeLabel = scope === 'project' ? 'Project' : 'Global';
  const projectHint = projectPath ? `${projectPath}/.agency/quick-actions.yaml` : 'Select a cell to edit project actions.';
  const scopeLocked = scope === 'project' && !canUseProjectScope;

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <p className="text-xs text-muted-foreground">
            Configure start/resume commands. Definitions are workflow-ready.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Scope: <span className="font-semibold text-foreground">{scopeLabel}</span> · {projectHint}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
            value={scope}
            onChange={(event) => onScopeChange?.(event.target.value)}
          >
            <option value="global">Global</option>
            <option value="project" disabled={!canUseProjectScope}>
              Project
            </option>
          </select>
          <button
            type="button"
            onClick={onAddAction}
            disabled={scopeLocked}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            type="button"
            onClick={onSaveActions}
            disabled={saving || scopeLocked}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
            actions.map((action) => (
              <div key={action.id} className="rounded-lg border border-border bg-card/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Label</label>
                      <input
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={action.label || ''}
                        onChange={(event) => onUpdateAction(action.id, { label: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Command / Script</label>
                      <textarea
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        rows={3}
                        value={action.startCommand || ''}
                        onChange={(event) => onUpdateAction(action.id, { startCommand: event.target.value })}
                        placeholder="Example: if make -n codex-local >/dev/null 2>&1; then make codex-local; else codex --dangerously-bypass-approvals-and-sandbox; fi"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Resume Command / Script</label>
                      <textarea
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        rows={2}
                        value={action.resumeCommand || ''}
                        onChange={(event) => onUpdateAction(action.id, { resumeCommand: event.target.value })}
                        placeholder="Optional. Leave empty if not supported."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAction(action.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                    title="Remove action"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No quick actions configured.</div>
          )}
        </div>
      </div>
    </section>
  );
}
