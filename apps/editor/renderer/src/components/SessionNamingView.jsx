import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { focusRing } from './ui/focusRing';
import { formatSessionName } from '../utils/sessionNaming';

const scopeLabels = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

const focusRingClass = focusRing.strong;

const buildPreviewList = ({ rule, nameLists, context }) => {
  const now = new Date();
  const samples = [1, 2, 3].map((value) =>
    formatSessionName({
      rule,
      nameLists,
      context,
      sequences: {
        absolute: value,
        active: Math.max(1, value - 1),
        profile: value,
        cell: value,
      },
      now,
    })
  );
  return samples.filter((item) => item);
};

const formatScopeLabel = (value) => scopeLabels[value] || value;

function SessionNamingListRow({
  name,
  items,
  disabled,
  onRename,
  onUpdateItems,
  onRemove,
}) {
  const [draftName, setDraftName] = useState(name);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const handleBlur = () => {
    if (draftName.trim() && draftName.trim() !== name) {
      onRename?.(name, draftName);
    } else {
      setDraftName(name);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handleItemsChange = (event) => {
    const next = event.target.value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    onUpdateItems?.(name, next);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`flex-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground ${focusRingClass}`}
        />
        <button
          type="button"
          onClick={() => onRemove?.(name)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-rose-300 hover:border-rose-400/50 disabled:opacity-50 ${focusRingClass}`}
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
      <textarea
        value={(items || []).join('\n')}
        onChange={handleItemsChange}
        disabled={disabled}
        rows={3}
        className={`w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono text-foreground ${focusRingClass}`}
        placeholder="One name per line"
      />
      <div className="text-[10px] text-muted-foreground/70">
        {items && items.length ? `Preview: ${items.slice(0, 4).join(', ')}` : 'No names yet.'}
      </div>
    </div>
  );
}

export function SessionNamingView({
  scope,
  scopeDisabled,
  scopePaths,
  settings,
  resolvedSettings,
  error,
  dirty,
  saving,
  previewContext,
  onUpdateRule,
  onUpdateList,
  onRenameList,
  onRemoveList,
  onAddList,
  onSave,
  onClearError,
}) {
  const scopeLabel = formatScopeLabel(scope);
  const scopePath = scopePaths?.[scope] || '';
  const scopeHint =
    scope === 'global'
      ? scopePath || 'Global User Config'
      : scope === 'project'
        ? scopePath || 'Select a Cell to edit project session naming.'
        : scopePath || 'Select a Cell to edit agent session naming.';

  const previewList = useMemo(() => {
    const source = resolvedSettings || settings || {};
    return buildPreviewList({
      rule: source.rule,
      nameLists: source.nameLists,
      context: previewContext || {},
    });
  }, [resolvedSettings, settings, previewContext]);

  const listEntries = useMemo(() => {
    const entries = Object.entries(settings?.nameLists || {});
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [settings?.nameLists]);

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Session Naming</h2>
            <div className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/40 text-primary">
              {scopeLabel} Scope
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/40 whitespace-nowrap">Source:</span>
            <span
              className="text-[11px] text-muted-foreground font-mono truncate opacity-60"
              title={scopeHint}
            >
              {scopeHint}
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
            onClick={onAddList}
            disabled={scopeDisabled}
            className={`inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50 ${focusRingClass}`}
          >
            <Plus size={14} aria-hidden="true" />
            New List
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || scopeDisabled || !dirty}
            className={`inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
          >
            <Save size={14} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            <AlertCircle size={14} className="mt-0.5" />
            <div className="flex-1">
              <div>{error}</div>
              <button
                type="button"
                onClick={onClearError}
                className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-rose-200/80"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles size={14} className="text-primary" />
              Naming Rule
            </div>
            <input
              type="text"
              value={settings?.rule || ''}
              onChange={(event) => onUpdateRule?.(event.target.value)}
              disabled={scopeDisabled}
              className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ${focusRingClass}`}
              placeholder="Session {seq:absolute:02} · {time:HHmm}"
            />
            <div className="text-[11px] text-muted-foreground/70">
              Use placeholders like <code>{'{time:HHmmss}'}</code>, <code>{'{seq:absolute:02}'}</code>,
              <code>{'{name:myth:absolute}'}</code>, <code>{'{cell}'}</code>, <code>{'{profile}'}</code>,
              <code>{'{project}'}</code>, <code>{'{branch}'}</code>, <code>{'{user}'}</code>.
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2">
            <div className="text-xs font-semibold text-foreground">Preview</div>
            {previewList.length ? (
              <div className="space-y-1 text-sm text-foreground">
                {previewList.map((preview, index) => (
                  <div key={`${preview}-${index}`} className="truncate">
                    {preview}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/60">No preview available.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
          <div className="text-xs font-semibold text-foreground">Name Lists</div>
          {listEntries.length ? (
            <div className="space-y-3">
              {listEntries.map(([name, items]) => (
                <SessionNamingListRow
                  key={name}
                  name={name}
                  items={items}
                  disabled={scopeDisabled}
                  onRename={onRenameList}
                  onUpdateItems={onUpdateList}
                  onRemove={onRemoveList}
                />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground/60">
              No name lists defined for this scope.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2 text-[11px] text-muted-foreground/70">
          <div className="text-xs font-semibold text-foreground">Suggested Patterns</div>
          <div>• <code>{'{name:myth:absolute}'} #{'{seq:absolute:02}'}</code></div>
          <div>• <code>{'{project}'} · {'{cell}'} · {'{time:HHmm}'}</code></div>
          <div>• <code>{'{profile}'} · {'{seq:active:02}'}</code></div>
        </div>
      </div>
    </section>
  );
}
