import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronsUpDown, RotateCcw, ScanText } from 'lucide-react';

import {
  WORKBENCH_LANGUAGE_OPTIONS,
  getWorkbenchLanguageLabel,
  normalizeWorkbenchLanguageId,
  type WorkbenchLanguageOption,
} from '../../../../shared/workbenchLanguageCore';
import type { WorkbenchLanguageDecision } from './workbenchLanguageDecision';
import { focusRing } from '../ui/focusRing';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';

type WorkbenchLanguageControlProps = {
  decision?: WorkbenchLanguageDecision | null;
  languageOptions?: ReadonlyArray<WorkbenchLanguageOption>;
  policyWarnings?: string[] | null;
  policyError?: string | null;
  disabled?: boolean;
  onSelectLanguage?: (language: string) => void;
  onResetToAuto?: () => void;
  className?: string;
};

const DEFAULT_DECISION: WorkbenchLanguageDecision = {
  language: 'plaintext',
  label: 'Plain Text',
  source: 'builtin',
  sourceLabel: 'Auto',
  provider: 'monaco-native',
  matchedRule: null,
};

const SOURCE_TONE_BY_KIND: Record<WorkbenchLanguageDecision['source'], string> = {
  builtin: 'text-slate-200/70 border-slate-300/20 bg-slate-400/10',
  project: 'text-sky-200/80 border-sky-300/25 bg-sky-500/10',
  manual: 'text-amber-100/85 border-amber-300/30 bg-amber-500/10',
};

const FILTER_INPUT_ID_SUFFIX = 'workbench-language-control-filter';

const normalizeWarningList = (value: string[] | null | undefined) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

const requestAnimationFrameFallback = (callback: FrameRequestCallback) =>
  window.setTimeout(() => callback(Date.now()), 0);

const cancelAnimationFrameFallback = (handle: number) => window.clearTimeout(handle);

export function WorkbenchLanguageControl({
  decision,
  languageOptions = WORKBENCH_LANGUAGE_OPTIONS,
  policyWarnings,
  policyError,
  disabled = false,
  onSelectLanguage,
  onResetToAuto,
  className = '',
}: WorkbenchLanguageControlProps) {
  const resolvedDecision = decision || DEFAULT_DECISION;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const panelId = useId();
  const filterInputId = `${useId()}-${FILTER_INPUT_ID_SUFFIX}`;

  useDismissibleLayer({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, panelRef],
  });

  const normalizedLanguage = normalizeWorkbenchLanguageId(
    resolvedDecision.language,
    DEFAULT_DECISION.language
  );
  const selectedLabel =
    resolvedDecision.label || getWorkbenchLanguageLabel(normalizedLanguage);
  const warnings = normalizeWarningList(policyWarnings);
  const errorText = String(policyError || '').trim();
  const hasPolicyIssue = Boolean(errorText || warnings.length);
  const canResetToAuto = resolvedDecision.source === 'manual' && Boolean(onResetToAuto);
  const sourceTone = SOURCE_TONE_BY_KIND[resolvedDecision.source] || SOURCE_TONE_BY_KIND.builtin;
  const normalizedQuery = filterQuery.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    const options = Array.isArray(languageOptions) ? languageOptions : WORKBENCH_LANGUAGE_OPTIONS;
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => {
      const normalizedLabel = option.label.toLowerCase();
      const normalizedId = option.id.toLowerCase();
      const aliasMatched = (option.aliases || []).some((alias) =>
        String(alias || '')
          .toLowerCase()
          .includes(normalizedQuery)
      );
      return (
        normalizedLabel.includes(normalizedQuery) ||
        normalizedId.includes(normalizedQuery) ||
        aliasMatched
      );
    });
  }, [languageOptions, normalizedQuery]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const requestFrame =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : requestAnimationFrameFallback;
    const cancelFrame =
      typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame.bind(window)
        : cancelAnimationFrameFallback;
    const frameId = requestFrame(() => {
      try {
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      } catch (_error) {
        // Ignore environment-specific focus failures (for example jsdom input polyfills).
      }
    });
    return () => cancelFrame(frameId);
  }, [open]);

  const handleToggleOpen = () => {
    if (disabled) {
      return;
    }
    setOpen((current) => !current);
  };

  const handleSelectLanguage = (languageId: string) => {
    onSelectLanguage?.(languageId);
    setOpen(false);
    setFilterQuery('');
  };

  const handleResetToAuto = () => {
    if (!canResetToAuto) {
      return;
    }
    onResetToAuto?.();
    setOpen(false);
    setFilterQuery('');
  };

  return (
    <div className={`relative inline-flex items-center ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Workbench language control"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`group inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors ${
          disabled
            ? 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30'
            : 'cursor-pointer border-white/15 bg-white/[0.04] text-white/65 hover:border-white/30 hover:bg-white/[0.08] hover:text-white/90'
        } ${focusRing.dark}`}
        data-testid="workbench-language-control-trigger"
      >
        <ScanText size={12} strokeWidth={2} aria-hidden="true" className="text-primary/80" />
        <span className="max-w-32 truncate text-[9px] font-black tracking-[0.12em] text-white/85">
          {selectedLabel}
        </span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold tracking-[0.12em] ${sourceTone}`}
          data-testid="workbench-language-control-source"
        >
          {resolvedDecision.sourceLabel}
        </span>
        {hasPolicyIssue ? (
          <AlertTriangle
            size={12}
            strokeWidth={2}
            aria-label="Workbench language policy issue"
            className="text-amber-300/90"
          />
        ) : null}
        <ChevronsUpDown
          size={11}
          strokeWidth={2}
          aria-hidden="true"
          className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="Workbench language picker"
          className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-xl border border-white/15 bg-[#0f131b]/95 p-2.5 shadow-2xl backdrop-blur-xl"
          data-testid="workbench-language-control-panel"
        >
          <div className="min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
              Language
            </h3>
            <p className="mt-1 truncate text-[10px] text-white/45">
              {selectedLabel} via {resolvedDecision.sourceLabel}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={filterInputId} className="sr-only">
              Filter languages
            </label>
            <input
              ref={filterInputRef}
              id={filterInputId}
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Filter languages"
              className={`h-7 w-full rounded-lg border border-white/15 bg-black/25 px-2.5 text-[11px] text-white/90 placeholder:text-white/35 ${focusRing.dark}`}
            />
            {canResetToAuto ? (
              <button
                type="button"
                onClick={handleResetToAuto}
                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-amber-300/35 bg-amber-500/10 px-2.5 text-[9px] font-black uppercase tracking-[0.11em] text-amber-100 transition-colors hover:bg-amber-400/20 ${focusRing.dark}`}
                data-testid="workbench-language-control-reset"
              >
                <RotateCcw size={11} strokeWidth={2} />
                Reset
              </button>
            ) : null}
          </div>

          <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/10 bg-black/20 p-1.5">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const selected = option.id === normalizedLanguage;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={selected}
                    onClick={() => {
                      if (selected) {
                        setOpen(false);
                        setFilterQuery('');
                        return;
                      }
                      handleSelectLanguage(option.id);
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-[10px] transition-colors last:mb-0 ${
                      selected
                        ? 'cursor-default border-primary/30 bg-primary/12 text-primary/85'
                        : 'border-transparent text-white/70 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/90'
                    } ${focusRing.dark}`}
                    data-testid={`workbench-language-option-${option.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold">{option.label}</span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                        {option.id}
                      </span>
                    </span>
                    {selected ? <Check size={12} strokeWidth={2.5} aria-hidden="true" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-white/15 px-2.5 py-4 text-center text-[10px] text-white/45">
                No language matched
              </div>
            )}
          </div>

          {resolvedDecision.source === 'project' && errorText ? (
            <div
              className="mt-2 rounded-lg border border-rose-300/35 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-100"
              data-testid="workbench-language-control-policy-error"
            >
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/85">
                Policy Error
              </div>
              <p className="mt-1 leading-relaxed text-rose-50/95">{errorText}</p>
            </div>
          ) : null}
          {resolvedDecision.source === 'project' && resolvedDecision.matchedRule?.match ? (
            <div className="mt-2 rounded-lg border border-sky-300/25 bg-sky-500/10 px-2.5 py-2 text-[10px] text-sky-50/95">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/85">
                Matched Rule
              </div>
              <p className="mt-1 font-mono text-sky-50/90">{resolvedDecision.matchedRule.match}</p>
            </div>
          ) : null}
          {resolvedDecision.source === 'project' && warnings.length ? (
            <div
              className="mt-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100"
              data-testid="workbench-language-control-policy-warnings"
            >
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/85">
                Rule Warnings
              </div>
              <ul className="mt-1 space-y-1 text-amber-50/95">
                {warnings.slice(0, 3).map((warning) => (
                  <li key={warning} className="leading-relaxed">
                    {warning}
                  </li>
                ))}
              </ul>
              {warnings.length > 3 ? (
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-amber-50/75">
                  +{warnings.length - 3} more
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
