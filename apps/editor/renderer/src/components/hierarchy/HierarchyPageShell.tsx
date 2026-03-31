import React from 'react';
import { focusRing } from '../ui/focusRing';
import type { ScopedConfigScope } from '../../app/appLayoutContracts';

type ScopeOption = {
  id: ScopedConfigScope;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type ScopePaths = Partial<Record<ScopedConfigScope, string>>;

const BASE_SCOPE_OPTIONS: ScopeOption[] = [
  { id: 'global', label: 'Global', hint: 'User' },
  { id: 'project', label: 'Project' },
  { id: 'agent', label: 'Agent' },
];

function deriveProjectHint(value: string): string {
  const normalized = String(value || '').replace(/\\/g, '/');
  if (!normalized) {
    return 'Open project';
  }
  const agencyIndex = normalized.indexOf('/.agency/');
  const repoRoot = agencyIndex >= 0 ? normalized.slice(0, agencyIndex) : normalized;
  const segments = repoRoot.split('/').filter(Boolean);
  return segments[segments.length - 1] || repoRoot || 'Project';
}

function deriveAgentHint(value: string): string {
  const normalized = String(value || '').replace(/\\/g, '/');
  if (!normalized) {
    return 'Select cell';
  }
  const marker = '/cells/';
  const startIndex = normalized.indexOf(marker);
  if (startIndex >= 0) {
    const remainder = normalized.slice(startIndex + marker.length);
    const [cellId] = remainder.split('/');
    return cellId || 'Selected cell';
  }
  return 'Selected cell';
}

export function buildScopeOptions(paths?: ScopePaths): ScopeOption[] {
  return BASE_SCOPE_OPTIONS.map((option) => ({
    ...option,
    hint:
      option.id === 'project'
        ? deriveProjectHint(paths?.project || '')
        : option.id === 'agent'
          ? deriveAgentHint(paths?.agent || '')
          : option.hint,
    disabled:
      option.id === 'project'
        ? !paths?.project
        : option.id === 'agent'
          ? !paths?.agent
          : undefined,
  }));
}

type HierarchyPageShellProps = {
  title: string;
  description: string;
  sourceHint?: string;
  sourceNote?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  secondaryHeader?: React.ReactNode;
  scope?: ScopedConfigScope;
  scopeOptions?: ScopeOption[];
  onSelectScope?: (scope: ScopedConfigScope) => void;
  contentScroll?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
};

function ScopeSwitcher({
  scope,
  scopeOptions,
  onSelectScope,
}: {
  scope?: ScopedConfigScope;
  scopeOptions?: ScopeOption[];
  onSelectScope?: (scope: ScopedConfigScope) => void;
}) {
  if (!scopeOptions?.length) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-sidebar/40 p-1 shadow-sm">
      {scopeOptions.map((option) => {
        const selected = option.id === scope;
        return (
          <button
            key={option.id}
            type="button"
            disabled={option.disabled}
            onClick={() => onSelectScope?.(option.id)}
            aria-pressed={selected}
            className={`min-w-[84px] rounded-xl px-3 py-2 text-xs font-semibold transition-all ${focusRing.default} ${
              selected
                ? 'bg-primary/14 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            } ${option.disabled ? 'cursor-not-allowed opacity-35' : ''}`}
          >
            <span className="block">{option.label}</span>
            {option.hint ? (
              <span className="mt-1 block truncate text-[10px] font-medium normal-case tracking-normal text-current/70">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function HierarchyPageShell({
  title,
  description,
  sourceHint = '',
  sourceNote = '',
  status,
  actions,
  secondaryHeader,
  scope,
  scopeOptions,
  onSelectScope,
  contentScroll = true,
  contentClassName = '',
  children,
}: HierarchyPageShellProps) {
  const contentClasses = contentScroll
    ? `flex-1 overflow-y-auto px-6 py-5 ${contentClassName}`.trim()
    : `flex-1 min-h-0 ${contentClassName}`.trim();

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="border-b border-border/70 bg-card/30 px-6 py-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
              {status ? <div className="shrink-0">{status}</div> : null}
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground/75">
              {description}
            </p>
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {actions}
            </div>
          ) : null}
        </div>

        {scopeOptions?.length || sourceHint ? (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <ScopeSwitcher
              scope={scope}
              scopeOptions={scopeOptions}
              onSelectScope={onSelectScope}
            />
            <div className="min-w-[280px] flex-1 rounded-2xl border border-border/60 bg-card/30 px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/45">
                Source
              </div>
              <div
                className="mt-1 truncate font-mono text-[12px] text-foreground/86"
                title={sourceHint || sourceNote}
              >
                {sourceHint || 'Unavailable'}
              </div>
              <div className="mt-1 text-[11px] leading-5 text-muted-foreground/66">
                {sourceNote || 'This surface resolves config through the current scope.'}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {secondaryHeader ? (
        <div
          className="border-b border-border/60 bg-card/20 px-6 py-3"
          data-testid="hierarchy-page-shell-secondary-header"
        >
          {secondaryHeader}
        </div>
      ) : null}

      <div className={contentClasses} data-testid="hierarchy-page-shell-content">
        {children}
      </div>
    </section>
  );
}
