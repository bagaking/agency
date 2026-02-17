import React, { useState } from 'react';
import { AlertCircle, Command, Info, Plus, Save } from 'lucide-react';
import { QuickActionProfileCard } from './quickActions/QuickActionProfileCard';
import { badgeClass, focusRingClass, formatScope } from './quickActions/quickActionsShared';

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
            <span className="text-[11px] text-muted-foreground font-mono truncate opacity-60" title={scopeHint}>
              {scopeHint}
            </span>
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
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80">
            <Info size={16} className="shrink-0" aria-hidden="true" />
            Select an agent in the sidebar to configure {scopeLabel} scoped Terminus.
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
      </div>
    </section>
  );
}

