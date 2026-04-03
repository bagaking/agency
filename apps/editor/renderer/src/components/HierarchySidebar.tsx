import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  SquareTerminal,
  Command,
  MessageSquareText,
  Tag,
  ServerCog,
  Link2,
} from 'lucide-react';
import { focusRing } from './ui/focusRing';
import { resolveAvailableHierarchyScope } from '../app/hierarchyScope';

type ScopeId = 'global' | 'project' | 'agent';

type ScopeSummary = {
  globalOverrides?: boolean;
  projectOverrides?: boolean;
  agentOverrides?: boolean;
  agentLabel?: string;
};

type HierarchySidebarProps = {
  section?: string;
  actionsScope?: ScopeId;
  appShortcutsScope?: ScopeId;
  replyQuickPromptsScope?: ScopeId;
  sessionNamingScope?: ScopeId;
  onSelectActionsScope?: (scope: ScopeId) => void;
  onSelectHarnessProviders?: () => void;
  onSelectAppShortcutsScope?: (scope: ScopeId) => void;
  onSelectReplyQuickPromptsScope?: (scope: ScopeId) => void;
  onSelectSessionNamingScope?: (scope: ScopeId) => void;
  onSelectSoftlinks?: () => void;
  canUseProjectScope?: boolean;
  canUseAgentScope?: boolean;
  actionSummary?: ScopeSummary;
  harnessProvidersDirty?: boolean;
  appShortcutsSummary?: ScopeSummary;
  replyQuickPromptsSummary?: ScopeSummary;
  sessionNamingSummary?: ScopeSummary;
};

type CapabilityDefinition = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  scope?: ScopeId;
  summary?: ScopeSummary;
  statusLabel?: string;
  onSelect?: () => void;
};

const SCOPE_LABELS: Record<ScopeId, string> = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

function getScopeLabel(scope?: ScopeId) {
  return scope ? SCOPE_LABELS[scope] : undefined;
}

function getScopeMeta(summary?: ScopeSummary, scope?: ScopeId) {
  if (!summary || !scope) {
    return undefined;
  }

  if (scope === 'global') {
    return summary.globalOverrides ? 'Overrides' : 'Base';
  }

  if (scope === 'project') {
    return summary.projectOverrides ? 'Custom' : 'Inherit';
  }

  if (scope === 'agent') {
    return summary.agentOverrides ? 'Custom' : 'Inherit';
  }

  return undefined;
}

export function HierarchySidebar({
  section,
  actionsScope,
  appShortcutsScope,
  replyQuickPromptsScope,
  sessionNamingScope,
  onSelectActionsScope,
  onSelectHarnessProviders,
  onSelectAppShortcutsScope,
  onSelectReplyQuickPromptsScope,
  onSelectSessionNamingScope,
  onSelectSoftlinks,
  canUseProjectScope,
  canUseAgentScope,
  actionSummary,
  harnessProvidersDirty,
  appShortcutsSummary,
  replyQuickPromptsSummary,
  sessionNamingSummary,
}: HierarchySidebarProps) {
  const primaryAgentLabel =
    actionSummary?.agentLabel ||
    appShortcutsSummary?.agentLabel ||
    replyQuickPromptsSummary?.agentLabel ||
    sessionNamingSummary?.agentLabel ||
    'Select Cell';

  const capabilityDefinitions: CapabilityDefinition[] = [
    {
      id: 'actions',
      title: 'Terminus',
      description: 'Quick actions, profiles, and bindings that follow the current scope.',
      icon: SquareTerminal,
      scope: actionsScope,
      summary: actionSummary,
      onSelect: () =>
        onSelectActionsScope?.(
          resolveAvailableHierarchyScope(actionsScope, { canUseProjectScope, canUseAgentScope })
        ),
    },
    {
      id: 'app-shortcuts',
      title: 'App Shortcuts',
      description: 'Customize keyboard shortcuts scoped to your workspace and agents.',
      icon: Command,
      scope: appShortcutsScope,
      summary: appShortcutsSummary,
      onSelect: () =>
        onSelectAppShortcutsScope?.(
          resolveAvailableHierarchyScope(appShortcutsScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        ),
    },
    {
      id: 'reply-quick-prompts',
      title: 'Reply Quick Prompts',
      description: 'Preset replies that can be tuned per project or agent.',
      icon: MessageSquareText,
      scope: replyQuickPromptsScope,
      summary: replyQuickPromptsSummary,
      onSelect: () =>
        onSelectReplyQuickPromptsScope?.(
          resolveAvailableHierarchyScope(replyQuickPromptsScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        ),
    },
    {
      id: 'session-naming',
      title: 'Session Naming',
      description: 'Rules that automate how sessions get named per scope.',
      icon: Tag,
      scope: sessionNamingScope,
      summary: sessionNamingSummary,
      onSelect: () =>
        onSelectSessionNamingScope?.(
          resolveAvailableHierarchyScope(sessionNamingScope, {
            canUseProjectScope,
            canUseAgentScope,
          })
        ),
    },
    {
      id: 'harness-providers',
      title: 'Harness Providers',
      description: 'Agent harness configuration and CLI providers for the main agent.',
      icon: ServerCog,
      statusLabel: harnessProvidersDirty ? 'Unsaved' : 'Synced',
      onSelect: onSelectHarnessProviders,
    },
    {
      id: 'softlinks',
      title: 'Directory Softlinks',
      description: 'Link worktree roots, repositories, and other directories into the workspace.',
      icon: Link2,
      statusLabel: 'Active',
      onSelect: onSelectSoftlinks,
    },
  ];

  const capabilityList = capabilityDefinitions.map((capability) => ({
    ...capability,
    scopeLabel: getScopeLabel(capability.scope),
    scopeMeta: getScopeMeta(capability.summary, capability.scope),
  }));

  const activeCapability =
    capabilityList.find((capability) => capability.id === section) || capabilityList[0];

  const activeScopeLine = activeCapability.scopeLabel
    ? `Active scope: ${activeCapability.scopeLabel}${
        activeCapability.scopeMeta ? ` · ${activeCapability.scopeMeta}` : ''
      }`
    : activeCapability.statusLabel
    ? `Status: ${activeCapability.statusLabel}`
    : undefined;

  return (
    <aside className="flex w-full flex-col text-sidebar-foreground select-none" data-testid="hierarchy-sidebar">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex flex-col min-w-0">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Hierarchy
          </h2>
          <div className="text-[10px] font-medium text-muted-foreground/40 mt-0.5">
            Capability Hub
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card/30 px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Current context
          </div>
          <div className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
            <activeCapability.icon size={16} strokeWidth={1.5} />
            {activeCapability.title}
          </div>
          {activeCapability.description ? (
            <p className="mt-1 text-[12px] text-muted-foreground/80">
              {activeCapability.description}
            </p>
          ) : null}
          {activeScopeLine ? (
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground/70">{activeScopeLine}</p>
          ) : null}
          {activeCapability.scopeLabel ? (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Selected cell:
              <span className="ml-1 font-semibold text-foreground">{primaryAgentLabel}</span>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                canUseProjectScope
                  ? 'border-border/60 text-foreground'
                  : 'border-border/40 text-muted-foreground/60'
              }`}
            >
              Project scope {canUseProjectScope ? 'ready' : 'locked'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                canUseAgentScope
                  ? 'border-border/60 text-foreground'
                  : 'border-border/40 text-muted-foreground/60'
              }`}
            >
              Agent scope {canUseAgentScope ? 'ready' : 'locked'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {capabilityList.map((capability) => (
            <CapabilityRow
              key={capability.id}
              icon={capability.icon}
              title={capability.title}
              description={capability.description}
              scopeLabel={capability.scopeLabel}
              scopeMeta={capability.scopeMeta}
              statusLabel={capability.statusLabel}
              selected={section === capability.id}
              onClick={capability.onSelect}
              dataTestId={`hierarchy-sidebar-${capability.id}`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

type CapabilityRowProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  scopeLabel?: string;
  scopeMeta?: string;
  statusLabel?: string;
  selected?: boolean;
  onClick?: () => void;
  dataTestId?: string;
};

function CapabilityRow({
  icon: Icon,
  title,
  description,
  scopeLabel,
  scopeMeta,
  statusLabel,
  selected,
  onClick,
  dataTestId,
}: CapabilityRowProps) {
  const isDisabled = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      data-testid={dataTestId}
      className={`group flex w-full gap-4 rounded-2xl border px-4 py-3 text-left transition-all ${focusRing.sidebar} ${
        selected
          ? 'border-primary/40 bg-primary/5 shadow-lg'
          : 'border-border/40 bg-card/60 hover:border-primary/40 hover:bg-muted/30'
      } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
          selected
            ? 'border-primary/40 bg-primary/5 text-primary'
            : 'border-border/50 bg-background/60 text-muted-foreground'
        }`}
      >
        <Icon size={18} strokeWidth={1.5} />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {statusLabel ? (
            <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground/70">{description}</p>
        {(scopeLabel || scopeMeta) && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {scopeLabel ? (
              <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5">
                {scopeLabel} scope
              </span>
            ) : null}
            {scopeMeta ? (
              <span className="rounded-full border border-border/50 bg-muted/10 px-2 py-0.5">
                {scopeMeta}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </button>
  );
}
