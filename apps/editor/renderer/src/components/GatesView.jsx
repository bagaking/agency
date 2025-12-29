import React, { useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  CopyPlus,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react';

const scopeLabels = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

const stageLabels = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

const formatScope = (value) => scopeLabels[value] || value;
const formatStage = (value) => stageLabels[value] || value;

const badgeClass = (variant) => {
  if (variant === 'warning') {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-200/70';
  }
  if (variant === 'primary') {
    return 'border-primary/30 bg-primary/5 text-primary';
  }
  return 'border-border/50 bg-muted/20 text-muted-foreground/60';
};

const parseCommands = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function GatesView({
  gates,
  scope,
  stage,
  scopeDisabled,
  scopePaths,
  error,
  saving,
  onSelectStage,
  onAddGate,
  onRemoveGate,
  onOverrideGate,
  onResetGate,
  onUpdateGate,
  onSaveGates,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const scopeLabel = formatScope(scope);
  const scopeHint =
    scope === 'global'
      ? 'Global User Config'
      : scope === 'project'
        ? scopePaths?.project || 'Select a Cell to edit project gates.'
        : scopePaths?.agent || 'Select a Cell to edit agent gates.';

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Gates</h2>
            <div
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass(
                'primary'
              )}`}
            >
              {scopeLabel} Scope
            </div>
            <div className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass('warning')}`}>
              {formatStage(stage)} Stage
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/40 whitespace-nowrap">
              Source:
            </span>
            <span
              className="text-[11px] text-muted-foreground font-mono truncate opacity-60"
              title={scopeHint}
            >
              {scopeHint}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddGate}
            disabled={scopeDisabled}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition-all disabled:opacity-50"
          >
            <Plus size={14} />
            New
          </button>
          <button
            type="button"
            onClick={onSaveGates}
            disabled={saving || scopeDisabled}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex border-b border-border px-6">
        {['draft', 'active', 'archived'].map((value) => (
          <button
            key={value}
            onClick={() => onSelectStage?.(value)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              stage === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {formatStage(value)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {scopeDisabled && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80 mb-6">
            <Info size={16} className="shrink-0" />
            Select an agent in the sidebar to configure {scopeLabel} scoped gates.
          </div>
        )}

        <div className="grid gap-2">
          {gates && gates.length ? (
            gates.map((gate) => {
              const meta = gate.meta || {};
              const isLocal = Boolean(meta.isLocal);
              const isExpanded = expandedId === gate.id;
              const isEditable = isLocal && !scopeDisabled;

              const inheritedFrom = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
              const overriddenBy = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
              const parentScope = meta.parentScope ? formatScope(meta.parentScope) : '';

              const resetLabel = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';
              const commandsText = Array.isArray(gate.commands) ? gate.commands.join('\n') : '';

              return (
                <div
                  key={gate.id}
                  className={`group rounded-lg border transition-all duration-200 ${
                    isExpanded ? 'border-primary/30 bg-card/40' : 'border-border bg-card/10 hover:border-border/80'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-3 cursor-pointer ${
                      isExpanded ? 'border-b border-border/50' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : gate.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-1.5 rounded bg-muted/20 ${isLocal ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        <ShieldCheck size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-medium truncate ${isLocal ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {gate.label || 'Unnamed Gate'}
                        </span>
                        <div className="flex items-center gap-2">
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted-foreground/40" />
                      ) : (
                        <ChevronDown size={14} className="text-muted-foreground/40" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-4 animate-tab-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
                            Gate Label
                          </label>
                          <input
                            className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                            value={gate.label || ''}
                            onChange={(e) => onUpdateGate(gate.id, { label: e.target.value })}
                            disabled={!isEditable}
                            placeholder="e.g. Spec complete"
                          />
                        </div>
                        <div className="flex items-end justify-end pb-0.5">
                          {!isLocal ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOverrideGate?.(gate.id);
                              }}
                              disabled={scopeDisabled}
                              className="inline-flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                            >
                              <CopyPlus size={14} />
                              Override to {scopeLabel}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                meta.hasParent && scope !== 'global'
                                  ? onResetGate?.(gate.id)
                                  : onRemoveGate?.(gate.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded border border-rose-500/30 px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/5 transition-all"
                            >
                              {meta.hasParent && scope !== 'global' ? (
                                <RotateCcw size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              {resetLabel}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">
                            Commands (run line by line)
                          </label>
                          <textarea
                            className="w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none disabled:opacity-50 min-h-[80px]"
                            value={commandsText}
                            onChange={(e) => onUpdateGate(gate.id, { commands: parseCommands(e.target.value) })}
                            disabled={!isEditable}
                            placeholder="e.g. test -f openspec/changes/.../proposal.md"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              <ShieldCheck size={32} className="opacity-10 mb-2" />
              <p className="text-sm">No gates configured for this stage.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
