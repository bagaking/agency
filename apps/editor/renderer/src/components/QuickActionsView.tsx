import React, { useState } from 'react';
import { AlertCircle, Command, Info, Plus, Save } from 'lucide-react';
import { QuickActionProfileCard } from './quickActions/QuickActionProfileCard';
import { focusRingClass, formatScope } from './quickActions/quickActionsShared';
import { HierarchyPageShell, ScopePaths, buildScopeOptions } from './hierarchy/HierarchyPageShell';

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
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedBindingKey, setExpandedBindingKey] = useState<string | null>(null);
  const [capturingBindingKey, setCapturingBindingKey] = useState<string | null>(null);

  const scopeLabel = formatScope(scope);
  const scopeHint =
    scope === 'global'
      ? scopePaths?.global || 'Global User Config'
      : scope === 'project'
        ? scopePaths?.project || 'Project scope requires an open project root.'
        : scopePaths?.agent || 'Agent scope requires a selected Cell.';
  const scopeOptions = buildScopeOptions(scopePaths as ScopePaths);
  const headerStatus = (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest ${
        dirty ? 'text-amber-400/80' : 'text-emerald-400/80'
      }`}
    >
      {dirty ? 'Unsaved Changes' : 'All Changes Saved'}
    </span>
  );
  const headerActions = (
    <>
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
    </>
  );
  const disabledMessage =
    scope === 'project'
      ? 'Project scope requires an open project root. Open a project to configure Project-scoped Terminus settings.'
      : 'Agent scope requires a selected Cell. Select a Cell to configure Agent-scoped Terminus settings.';
  const sourceNote =
    'Terminus settings merge global defaults with project and agent overrides so the selected scope reflects the resolved command bindings.';

  return (
    <HierarchyPageShell
      title="Terminus"
      description="Manage action profiles, shortcuts, and bindings within the selected scope."
      scope={scope}
      scopeOptions={scopeOptions}
      sourceHint={scopeHint}
      sourceNote={sourceNote}
      status={headerStatus}
      actions={headerActions}
    >
      {error ? (
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
      ) : null}

      {scopeDisabled ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80">
          <Info size={16} className="shrink-0" aria-hidden="true" />
          {disabledMessage}
        </div>
      ) : null}

      <div className="grid gap-2">
        {actions && actions.length ? (
          actions.map((action) => (
            <QuickActionProfileCard
              key={action.id}
              action={action}
              bindingsByProfile={bindingsByProfile}
              activeProfileId={activeProfileId}
              scope={scope}
              scopeLabel={scopeLabel}
              scopeDisabled={scopeDisabled}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              expandedBindingKey={expandedBindingKey}
              setExpandedBindingKey={setExpandedBindingKey}
              capturingBindingKey={capturingBindingKey}
              setCapturingBindingKey={setCapturingBindingKey}
              onAddBinding={onAddBinding}
              onRemoveAction={onRemoveAction}
              onOverrideAction={onOverrideAction}
              onResetAction={onResetAction}
              onUpdateAction={onUpdateAction}
              onRemoveBinding={onRemoveBinding}
              onOverrideBinding={onOverrideBinding}
              onResetBinding={onResetBinding}
              onUpdateBinding={onUpdateBinding}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Command size={32} className="opacity-10 mb-2" aria-hidden="true" />
            <p className="text-sm">No Terminus configured for this scope.</p>
          </div>
        )}
      </div>
    </HierarchyPageShell>
  );
}
