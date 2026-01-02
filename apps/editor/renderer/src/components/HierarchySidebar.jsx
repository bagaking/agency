import React from 'react';
import { SquareTerminal, FolderClosed, User, Link2, ShieldCheck } from 'lucide-react';

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
    <aside className="flex w-full flex-col text-sidebar-foreground select-none" data-testid="hierarchy-sidebar">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex flex-col min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 text-xs">Hierarchy</h2>
            <div className="text-[10px] font-medium text-muted-foreground/40 mt-0.5">Configuration Resolution</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">AUTOMATION ACTIONS</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={SquareTerminal}
            label="Global User"
            meta={actionSummary?.globalOverrides ? 'Overrides' : 'Base'}
            selected={section === 'actions' && actionsScope === 'global'}
            onClick={() => onSelectActionsScope?.('global')}
          />
          <ScopeItem
            icon={FolderClosed}
            label="Project Local"
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

        <div className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">COMPLIANCE GATES</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={ShieldCheck}
            label="Global Policy"
            meta={gateSummary?.globalOverrides ? 'Overrides' : 'Base'}
            selected={section === 'gates' && gateScope === 'global'}
            onClick={() => onSelectGateScope?.('global')}
          />
          <ScopeItem
            icon={FolderClosed}
            label="Project Specific"
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

        <div className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">SHARED STATE</div>
        <div className="space-y-0.5">
          <ScopeItem
            icon={Link2}
            label="Directory Softlinks"
            meta="Active"
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
      className={`group flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-all ${
        selected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
      } ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
    >
      <Icon size={14} strokeWidth={1.5} className={selected ? 'text-primary' : 'opacity-50'} />
      <span className="truncate font-medium">{label}</span>
      {meta ? (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/40">
          {meta}
        </span>
      ) : null}
    </button>
  );
}
