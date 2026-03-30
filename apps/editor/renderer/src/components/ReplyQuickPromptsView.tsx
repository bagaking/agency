import React from 'react';
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react';
import { focusRing } from './ui/focusRing';
import { scopeLabelMap } from '../utils/replyQuickPrompts';
import {
  HierarchyPageShell,
  buildScopeOptions,
  type ScopePaths,
} from './hierarchy/HierarchyPageShell';

const focusRingClass = focusRing.strong;

const formatScopeLabel = (value) => scopeLabelMap[value] || value;

function ScopeBadge({ scope }: any) {
  return (
    <span className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
      {formatScopeLabel(scope)}
    </span>
  );
}

function PromptRow({ prompt, disabled, onUpdate, onRemove }: any) {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Prompt title"
          value={prompt?.title || ''}
          onChange={(event) => onUpdate?.(prompt.id, { title: event.target.value })}
          disabled={disabled}
          placeholder="Optional title"
          className={`flex-1 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground ${focusRingClass}`}
        />
        <label className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          <input
            type="checkbox"
            aria-label="Prompt enabled"
            checked={prompt?.enabled !== false}
            onChange={(event) => onUpdate?.(prompt.id, { enabled: event.target.checked })}
            disabled={disabled}
            className={focusRingClass}
          />
          Enabled
        </label>
        <button
          type="button"
          onClick={() => onRemove?.(prompt.id)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50 ${focusRingClass}`}
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
      <textarea
        aria-label="Prompt text"
        value={prompt?.text || ''}
        onChange={(event) => onUpdate?.(prompt.id, { text: event.target.value })}
        disabled={disabled}
        rows={3}
        placeholder="Prompt text"
        className={`w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono text-foreground ${focusRingClass}`}
      />
    </div>
  );
}

export function ReplyQuickPromptsView({
  scope,
  onSelectScope,
  scopeDisabled,
  scopePaths,
  prompts,
  resolvedPrompts,
  error,
  dirty,
  saving,
  onAddPrompt,
  onUpdatePrompt,
  onRemovePrompt,
  onSavePrompts,
  onClearError,
}: any) {
  const scopePath = scopePaths?.[scope] || '';
  const scopeHint =
    scope === 'global'
      ? scopePath || 'Global User Config'
      : scope === 'project'
        ? scopePath || 'Select a project to edit project reply quick prompts.'
        : scopePath || 'Select a Cell to edit agent reply quick prompts.';
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
        onClick={onAddPrompt}
        disabled={scopeDisabled}
        className={`inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50 ${focusRingClass}`}
      >
        <Plus size={14} />
        Add Prompt
      </button>
      <button
        type="button"
        onClick={onSavePrompts}
        disabled={saving || scopeDisabled || !dirty}
        className={`inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
      >
        <Save size={14} />
        {saving ? 'Saving…' : 'Save'}
      </button>
    </>
  );
  const sourceNote =
    'Prompts are authored per scope but previewed as one merged, deduplicated list so the composer result stays legible and auditable.';
  const disabledMessage =
    scope === 'project'
      ? 'Project scope requires an open project root. Open a project to edit Project-scoped quick prompts.'
      : 'Agent scope requires a selected Cell. Select a Cell to edit Agent-scoped quick prompts.';

  return (
    <HierarchyPageShell
      title="Reply Quick Prompts"
      description="Manage reply snippets by scope while keeping the merged result visible."
      scope={scope}
      scopeOptions={scopeOptions}
      onSelectScope={onSelectScope}
      sourceHint={scopeHint}
      sourceNote={sourceNote}
      status={headerStatus}
      actions={headerActions}
    >
      {scopeDisabled ? (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/85">
          {disabledMessage}
        </div>
      ) : null}

      <div className="space-y-5">
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

        <div className="grid gap-5 lg:grid-cols-[3fr,2fr]">
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="text-xs font-semibold text-foreground">Scoped Prompt List</div>
            {(prompts || []).length ? (
              <div className="space-y-3">
                {(prompts || []).map((prompt) => (
                  <PromptRow
                    key={prompt.id}
                    prompt={prompt}
                    disabled={scopeDisabled}
                    onUpdate={onUpdatePrompt}
                    onRemove={onRemovePrompt}
                  />
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/60">
                No prompts in this scope.
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="text-xs font-semibold text-foreground">Resolved Preview (Union + Dedupe)</div>
            {(resolvedPrompts || []).length ? (
              <div className="space-y-2">
                {(resolvedPrompts || []).map((prompt) => (
                  <div
                    key={prompt.id}
                    className="space-y-1 rounded-md border border-border/50 bg-background/50 px-3 py-2"
                  >
                    {prompt.title ? (
                      <div className="text-[11px] font-semibold text-foreground">{prompt.title}</div>
                    ) : null}
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {prompt.text}
                    </pre>
                    <div className="flex flex-wrap gap-1">
                      {(prompt.sources || []).map((source) => (
                        <ScopeBadge key={`${prompt.id}-${source}`} scope={source} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/60">No resolved prompts.</div>
            )}
          </div>
        </div>
      </div>
    </HierarchyPageShell>
  );
}
