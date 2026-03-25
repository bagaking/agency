import React from 'react';
import { AlertCircle, Info, Save, ServerCog } from 'lucide-react';
import { focusRingClass } from './quickActions/quickActionsShared';

const REASONING_OPTIONS = ['', 'low', 'medium', 'high', 'xhigh'];

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {children}
      </div>
      {hint ? <div className="text-[11px] text-muted-foreground/60">{hint}</div> : null}
    </label>
  );
}

export function HarnessProviderSettingsView({
  codexCliProvider,
  settingsPath,
  error,
  dirty,
  saving,
  onUpdateCodexCliProvider,
  onSaveSettings,
  onClearError,
}: any) {
  const config = codexCliProvider || {};
  const missingRequired = [
    !String(config.baseUrl || '').trim() ? 'base_url' : '',
    !String(config.model || '').trim() ? 'model' : '',
    !String(config.openAIApiKey || '').trim() ? 'OPENAI_API_KEY' : '',
  ].filter(Boolean);

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Harness Providers</h2>
            <div className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/20 bg-primary/10 text-primary/80">
              Global Scope
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-muted-foreground/40 whitespace-nowrap">Source:</span>
            <span className="text-[11px] text-muted-foreground font-mono truncate opacity-60" title={settingsPath}>
              {settingsPath}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${dirty ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
            {dirty ? 'Unsaved Changes' : 'All Changes Saved'}
          </span>
          <button
            type="button"
            onClick={onSaveSettings}
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-50 ${focusRingClass}`}
          >
            <Save size={14} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
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

        <div className="rounded-lg border border-border/50 bg-background/40 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary/80">
              <ServerCog size={16} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">Codex CLI Provider</div>
              <div className="text-xs leading-relaxed text-muted-foreground/70">
                Agency launches Harness provider runs through a dedicated global Codex provider config.
                This config bypasses unrelated workstation-level provider/env defaults and supplies the
                exact OpenAI-compatible endpoint and credentials used by `agent_backed` execution.
              </div>
            </div>
          </div>
        </div>

        {missingRequired.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Required before `Create Agent` / `Fork` can run through `codex_cli`: {missingRequired.join(', ')}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel hint="Required. OpenAI-compatible Responses API base URL.">base_url</FieldLabel>
            <input
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono focus:border-primary ${focusRingClass}`}
              value={config.baseUrl || ''}
              onChange={(event) => onUpdateCodexCliProvider?.({ baseUrl: event.target.value })}
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel hint="Required. Model passed to Codex for provider-backed execution.">model</FieldLabel>
            <input
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono focus:border-primary ${focusRingClass}`}
              value={config.model || ''}
              onChange={(event) => onUpdateCodexCliProvider?.({ model: event.target.value })}
              autoComplete="off"
              spellCheck={false}
              placeholder="gpt-5.4"
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <FieldLabel hint="Required. Stored in Agency's global Harness provider config and injected as OPENAI_API_KEY for Codex provider runs.">
              OPENAI_API_KEY
            </FieldLabel>
            <input
              type="password"
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono focus:border-primary ${focusRingClass}`}
              value={config.openAIApiKey || ''}
              onChange={(event) => onUpdateCodexCliProvider?.({ openAIApiKey: event.target.value })}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel hint="Optional. Codex `model_reasoning_effort` override.">model_reasoning_effort</FieldLabel>
            <select
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm focus:border-primary ${focusRingClass}`}
              value={config.modelReasoningEffort || ''}
              onChange={(event) =>
                onUpdateCodexCliProvider?.({ modelReasoningEffort: event.target.value })
              }
            >
              <option value="">Default</option>
              {REASONING_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <FieldLabel hint="Optional. Codex `model_context_window` override.">model_context_window</FieldLabel>
            <input
              type="number"
              min={1}
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono focus:border-primary ${focusRingClass}`}
              value={config.modelContextWindow ?? ''}
              onChange={(event) =>
                onUpdateCodexCliProvider?.({ modelContextWindow: event.target.value })
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 200000"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel hint="Optional. Codex `model_auto_compact_token_limit` override.">
              model_auto_compact_token_limit
            </FieldLabel>
            <input
              type="number"
              min={1}
              className={`w-full rounded border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono focus:border-primary ${focusRingClass}`}
              value={config.modelAutoCompactTokenLimit ?? ''}
              onChange={(event) =>
                onUpdateCodexCliProvider?.({
                  modelAutoCompactTokenLimit: event.target.value,
                })
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 120000"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
