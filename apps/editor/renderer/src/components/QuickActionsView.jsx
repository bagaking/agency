import React, { useState } from 'react';
import { Plus, Save, Trash2, CopyPlus, RotateCcw, Command, ChevronDown, ChevronUp, AlertCircle, Info, Keyboard } from 'lucide-react';

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

export function QuickActionsView({
  actions,
  bindings = [],
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
  const [expandedBindingId, setExpandedBindingId] = useState(null);

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
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition-all disabled:opacity-50"
          >
            <Plus size={14} />
            New
          </button>
          <button
            type="button"
            onClick={onSaveActions}
            disabled={saving || scopeDisabled || !dirty}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
            {onClearError ? (
              <button
                type="button"
                onClick={onClearError}
                className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-rose-200/80"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        )}

        {scopeDisabled && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80 mb-6">
                <Info size={16} className="shrink-0" />
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
              
              const inheritedFrom = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
              const overriddenBy = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
              const parentScope = meta.parentScope ? formatScope(meta.parentScope) : '';
              
              const resetLabel = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';

              return (
                <div 
                    key={action.id} 
                    className={`group rounded-lg border transition-all duration-200 ${
                        isExpanded ? 'border-primary/30 bg-card/40' : 'border-border bg-card/10 hover:border-border/80'
                    }`}
                >
                    {/* Header: Clickable to Expand */}
                    <div 
                        className={`flex items-center justify-between p-3 cursor-pointer ${isExpanded ? 'border-b border-border/50' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : action.id)}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`p-1.5 rounded bg-muted/20 ${isLocal ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                <Command size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-medium truncate ${isLocal ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                                    {action.label || 'Unnamed Terminus'}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isLocked ? (
                                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary/60">Baseline</span>
                                    ) : null}
                                    {!isLocal && (
                                        <span className={`text-[10px] font-bold uppercase tracking-tight text-muted-foreground/40`}>
                                            Inherited from {inheritedFrom}
                                        </span>
                                    )}
                                    {isLocal && parentScope && (
                                        <span className={`text-[10px] font-bold uppercase tracking-tight text-primary/60`}>
                                            Overrides {parentScope}
                                        </span>
                                    )}
                                    {overriddenBy && (
                                        <span className={`text-[10px] font-bold uppercase tracking-tight text-amber-500/60`}>
                                            Overridden by {overriddenBy}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={14} className="text-muted-foreground/40" /> : <ChevronDown size={14} className="text-muted-foreground/40" />}
                        </div>
                    </div>

                    {/* Content: Inputs */}
                    {isExpanded && (
                        <div className="p-4 space-y-4 animate-tab-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Profile Label</label>
                                    <input
                                        className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                                        value={action.label || ''}
                                        onChange={(e) => onUpdateAction(action.id, { label: e.target.value })}
                                        disabled={!isEditable}
                                        placeholder="e.g. Build Project"
                                    />
                                </div>
                                <div className="flex items-end justify-end pb-0.5">
                                    {!isLocal ? (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onOverrideAction?.(action.id); }}
                                            disabled={scopeDisabled}
                                            className="inline-flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                                        >
                                            <CopyPlus size={14} />
                                            Override to {scopeLabel}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); meta.hasParent && scope !== 'global' ? onResetAction?.(action.id) : onRemoveAction?.(action.id); }}
                                            disabled={isLocked}
                                            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold transition-all ${
                                              isLocked
                                                ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                                                : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/5'
                                            }`}
                                        >
                                            {meta.hasParent && scope !== 'global' ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                            {resetLabel}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Start Command</label>
                                    <textarea
                                        className="w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none disabled:opacity-50 min-h-[60px]"
                                        value={action.startCommand || ''}
                                        onChange={(e) => onUpdateAction(action.id, { startCommand: e.target.value })}
                                        disabled={!isEditable}
                                        placeholder="Command to start a new session (e.g., npm run dev)"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Resume Command</label>
                                    <textarea
                                        className="w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none disabled:opacity-50 min-h-[60px]"
                                        value={action.resumeCommand || ''}
                                        onChange={(e) => onUpdateAction(action.id, { resumeCommand: e.target.value })}
                                        disabled={!isEditable}
                                        placeholder="Optional: command to run in an existing session"
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
               <Command size={32} className="opacity-10 mb-2" />
               <p className="text-sm">No Terminus configured for this scope.</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <Keyboard size={14} />
              Shortcuts
            </div>
            <button
              type="button"
              onClick={onAddBinding}
              disabled={scopeDisabled}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/60 hover:text-primary transition-all disabled:opacity-50"
            >
              <Plus size={12} />
              New Shortcut
            </button>
          </div>

          <div className="grid gap-2">
            {bindings && bindings.length ? (
              bindings.map((binding) => {
                const meta = binding.meta || {};
                const isLocal = Boolean(meta.isLocal);
                const isExpanded = expandedBindingId === binding.id;
                const isEditable = isLocal && !scopeDisabled;
                const inheritedFrom = meta.inheritedFrom ? formatScope(meta.inheritedFrom) : '';
                const overriddenBy = meta.overriddenBy ? formatScope(meta.overriddenBy) : '';
                const parentScope = meta.parentScope ? formatScope(meta.parentScope) : '';
                const resetLabel = meta.hasParent && scope !== 'global' ? 'Reset' : 'Remove';
                const action = binding.action || {};
                const actionType = action.type || 'sendText';
                const keysValue = Array.isArray(action.keys) ? action.keys.join(', ') : '';
                const textValue = action.text || '';

                return (
                  <div
                    key={binding.id}
                    className={`group rounded-lg border transition-all duration-200 ${
                      isExpanded ? 'border-primary/30 bg-card/40' : 'border-border bg-card/10 hover:border-border/80'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between p-3 cursor-pointer ${isExpanded ? 'border-b border-border/50' : ''}`}
                      onClick={() => setExpandedBindingId(isExpanded ? null : binding.id)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-1.5 rounded bg-muted/20 ${isLocal ? 'text-primary' : 'text-muted-foreground/40'}`}>
                          <Keyboard size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-medium truncate ${isLocal ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                            {binding.label || 'Unnamed Shortcut'}
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
                        {isExpanded ? <ChevronUp size={14} className="text-muted-foreground/40" /> : <ChevronDown size={14} className="text-muted-foreground/40" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4 animate-tab-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Shortcut Label</label>
                            <input
                              className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                              value={binding.label || ''}
                              onChange={(e) => onUpdateBinding?.(binding.id, { label: e.target.value })}
                              disabled={!isEditable}
                              placeholder="e.g. Run in Agent"
                            />
                          </div>
                          <div className="flex items-end justify-end pb-0.5">
                            {!isLocal ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOverrideBinding?.(binding.id); }}
                                disabled={scopeDisabled}
                                className="inline-flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                              >
                                <CopyPlus size={14} />
                                Override to {scopeLabel}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); meta.hasParent && scope !== 'global' ? onResetBinding?.(binding.id) : onRemoveBinding?.(binding.id); }}
                                className="inline-flex items-center gap-1.5 rounded border border-rose-500/30 px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/5 transition-all"
                              >
                                {meta.hasParent && scope !== 'global' ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                {resetLabel}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Shortcut Key</label>
                            <input
                              className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none disabled:opacity-50"
                              value={binding.key || ''}
                              onChange={(e) => onUpdateBinding?.(binding.id, { key: e.target.value })}
                              disabled={!isEditable}
                              placeholder="Cmd+Enter"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Action Type</label>
                            <select
                              className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                              value={actionType}
                              onChange={(e) => onUpdateBinding?.(binding.id, { action: { ...action, type: e.target.value } })}
                              disabled={!isEditable}
                            >
                              <option value="sendKeys">Send Keys</option>
                              <option value="sendText">Send Text</option>
                              <option value="pasteFiles">Paste Files</option>
                            </select>
                          </div>
                        </div>

                        {actionType === 'sendKeys' ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Keys</label>
                            <input
                              className="w-full rounded border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none disabled:opacity-50"
                              value={keysValue}
                              onChange={(e) => onUpdateBinding?.(binding.id, { action: { ...action, keys: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) } })}
                              disabled={!isEditable}
                              placeholder="Enter, Escape"
                            />
                          </div>
                        ) : null}

                        {actionType === 'sendText' ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Text</label>
                            <textarea
                              className="w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none disabled:opacity-50 min-h-[60px]"
                              value={textValue}
                              onChange={(e) => onUpdateBinding?.(binding.id, { action: { ...action, text: e.target.value } })}
                              disabled={!isEditable}
                              placeholder="Text to send into the terminal"
                            />
                          </div>
                        ) : null}

                        {actionType === 'pasteFiles' ? (
                          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                            Uses the clipboard helper to paste files with safe path quoting.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                <Keyboard size={28} className="opacity-10 mb-2" />
                <p className="text-sm">No shortcuts configured for this scope.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
