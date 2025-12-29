import React from 'react';
import { Command, Folder, User, Link2, ShieldCheck } from 'lucide-react';

export function HierarchySidebar({
  section,
  actionsScope,
  gateScope,
  onSelectActionsScope,
  onSelectGateScope,
  onSelectSoftlinks,
  canUseProjectScope,
  canUseAgentScope,
  actionSummary,
  gateSummary,
}) {
  return (
    <aside
      className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      data-testid="hierarchy-sidebar"
    >
      <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Hierarchy</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">ACTIONS</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={Command}
            label="Global"
            meta={actionSummary?.globalOverrides ? 'Overrides' : 'Base'}
            selected={section === 'actions' && actionsScope === 'global'}
            onClick={() => onSelectActionsScope?.('global')}
          />
          <ScopeItem
            icon={Folder}
            label="Project"
            meta={actionSummary?.projectOverrides ? 'Custom' : 'Inherit'}
            selected={section === 'actions' && actionsScope === 'project'}
            disabled={!canUseProjectScope}
            onClick={() => onSelectActionsScope?.('project')}
          />
          <ScopeItem
            icon={User}
            label={`Agent - ${actionSummary?.agentLabel || 'Select Cell'}`}
            meta={actionSummary?.agentOverrides ? 'Custom' : 'Inherit'}
            selected={section === 'actions' && actionsScope === 'agent'}
            disabled={!canUseAgentScope}
            onClick={() => onSelectActionsScope?.('agent')}
          />
        </div>

        <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">GATES</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={ShieldCheck}
            label="Global"
            meta={gateSummary?.globalOverrides ? 'Overrides' : 'Base'}
            selected={section === 'gates' && gateScope === 'global'}
            onClick={() => onSelectGateScope?.('global')}
          />
          <ScopeItem
            icon={Folder}
            label="Project"
            meta={gateSummary?.projectOverrides ? 'Custom' : 'Inherit'}
            selected={section === 'gates' && gateScope === 'project'}
            disabled={!canUseProjectScope}
            onClick={() => onSelectGateScope?.('project')}
          />
          <ScopeItem
            icon={User}
            label={`Agent - ${gateSummary?.agentLabel || 'Select Cell'}`}
            meta={gateSummary?.agentOverrides ? 'Custom' : 'Inherit'}
            selected={section === 'gates' && gateScope === 'agent'}
            disabled={!canUseAgentScope}
            onClick={() => onSelectGateScope?.('agent')}
          />
        </div>

        <div className="mb-2 mt-4 px-2 text-xs font-medium text-muted-foreground">SOFTLINKS</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={Link2}
            label="Softlinks"
            meta="Configure"
            selected={section === 'softlinks'}
            onClick={() => onSelectSoftlinks?.()}
          />
        </div>
      </div>
    </aside>
  );
}

function ScopeItem({ icon: Icon, label, meta, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
        selected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <Icon size={14} className={selected ? 'text-primary' : 'opacity-70'} />
      <span className="truncate">{label}</span>
      {meta ? (
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </button>
  );
}
