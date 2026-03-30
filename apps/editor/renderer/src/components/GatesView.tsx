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
import { IconButton } from './ui/IconButton';
import {
  HierarchyPageShell,
  buildScopeOptions,
  type ScopePaths,
} from './hierarchy/HierarchyPageShell';

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
  onSelectScope,
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
}: any) {
  const [expandedId, setExpandedId] = useState(null);

  const scopeHint =
    scope === 'global'
      ? scopePaths?.global || 'Global User Config'
      : scope === 'project'
        ? scopePaths?.project || 'Select a project to edit project gates.'
        : scopePaths?.agent || 'Select a Cell to edit agent gates.';
  const scopeOptions = buildScopeOptions(scopePaths as ScopePaths);
  const headerStatus = (
    <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${badgeClass('warning')}`}>
      {formatStage(stage)} Stage
    </div>
  );
  const headerActions = (
    <>
      <IconButton
        label="New gate"
        tooltip="New gate"
        side="left"
        onClick={onAddGate}
        disabled={scopeDisabled}
        className="h-9 w-9 rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
      >
        <Plus size={14} aria-hidden="true" />
      </IconButton>
      <IconButton
        label={saving ? 'Saving gates' : 'Save gates'}
        tooltip={saving ? 'Saving gates…' : 'Save gates'}
        side="left"
        onClick={onSaveGates}
        disabled={saving || scopeDisabled}
        className="h-9 w-9 rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm shadow-primary/20 disabled:opacity-50"
      >
        <Save size={14} aria-hidden="true" />
      </IconButton>
    </>
  );
  const sourceNote =
    'Gates remain grouped by lifecycle stage and resolve by id across scopes. The selected scope controls which definitions are editable.';
  const disabledMessage =
    scope === 'project'
      ? 'Project scope requires an open project root. Open a project to configure Project-scoped gates.'
      : 'Agent scope requires a selected Cell. Select a Cell to configure Agent-scoped gates.';
  const stageSwitcher = (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-card/35 p-1">
      {['draft', 'active', 'archived'].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelectStage?.(value)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            stage === value
              ? 'bg-primary/12 text-primary shadow-[0_12px_24px_rgba(0,0,0,0.12)]'
              : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
          }`}
        >
          {formatStage(value)}
        </button>
      ))}
    </div>
  );

  return (
    <HierarchyPageShell
      title="Compliance Gates"
      description="Define stage-aware policy gates that protect lifecycle changes and command flows."
      scope={scope}
      scopeOptions={scopeOptions}
      onSelectScope={onSelectScope}
      sourceHint={scopeHint}
      sourceNote={sourceNote}
      status={headerStatus}
      actions={headerActions}
      secondaryHeader={stageSwitcher}
    >
      {scopeDisabled ? (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/85">
          {disabledMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

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
              const resetTooltip =
                meta.hasParent && scope !== 'global'
                  ? `Reset to ${parentScope || 'parent scope'}`
                  : 'Remove gate';
              const commandsText = Array.isArray(gate.commands) ? gate.commands.join('\n') : '';

              return (
                <div
                  key={gate.id}
                  className={`group rounded-lg border transition-all duration-200 ${
                    isExpanded
                      ? 'border-primary/30 bg-card/40'
                      : 'border-border bg-card/10 hover:border-border/80'
                  }`}
                >
                  <div
                    className={`flex cursor-pointer items-center justify-between p-3 ${
                      isExpanded ? 'border-b border-border/50' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : gate.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`rounded bg-muted/20 p-1.5 ${
                          isLocal ? 'text-primary' : 'text-muted-foreground/40'
                        }`}
                      >
                        <ShieldCheck size={14} />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span
                          className={`truncate text-sm font-medium ${
                            isLocal ? 'text-foreground' : 'text-muted-foreground/60'
                          }`}
                        >
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
                    <div className="animate-tab-in space-y-4 p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            Gate Label
                          </label>
                          <input
                            aria-label={`Gate label ${gate.id}`}
                            className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                            value={gate.label || ''}
                            onChange={(e) => onUpdateGate(gate.id, { label: e.target.value })}
                            disabled={!isEditable}
                            placeholder="e.g. Spec complete"
                          />
                        </div>
                        <div className="flex items-end justify-end pb-0.5">
                          {!isLocal ? (
                            <IconButton
                              label={`Override to ${formatScope(scope)}`}
                              tooltip={`Override to ${formatScope(scope)}`}
                              side="left"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOverrideGate?.(gate.id);
                              }}
                              disabled={scopeDisabled}
                              className="h-8 w-8 rounded-md border border-primary/30 text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                            >
                              <CopyPlus size={14} aria-hidden="true" />
                            </IconButton>
                          ) : (
                            <IconButton
                              label={resetTooltip}
                              tooltip={resetTooltip}
                              side="left"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (meta.hasParent && scope !== 'global') {
                                  onResetGate?.(gate.id);
                                } else {
                                  onRemoveGate?.(gate.id);
                                }
                              }}
                              disabled={scopeDisabled}
                              className="h-8 w-8 rounded-md border border-border text-muted-foreground transition-colors hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                            >
                              {meta.hasParent && scope !== 'global' ? (
                                <RotateCcw size={14} aria-hidden="true" />
                              ) : (
                                <Trash2 size={14} aria-hidden="true" />
                              )}
                            </IconButton>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          Commands
                        </label>
                        <textarea
                          aria-label={`Gate commands ${gate.id}`}
                          className="min-h-[140px] w-full rounded border border-border/50 bg-background/50 px-3 py-2 font-mono text-xs leading-5 focus:border-primary focus:outline-none disabled:opacity-50"
                          value={commandsText}
                          onChange={(event) =>
                            onUpdateGate(gate.id, { commands: parseCommands(event.target.value) })
                          }
                          disabled={!isEditable}
                          placeholder="# One command per line"
                        />
                      </div>

                      {!isEditable ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground/70">
                          <Info size={14} />
                          Override this gate in the selected scope to edit it here.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
              No gates defined for this stage in the selected scope.
            </div>
          )}
        </div>
      </div>
    </HierarchyPageShell>
  );
}
