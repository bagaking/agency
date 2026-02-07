import React from 'react';
import { Settings, ListTree, Folder, Brain, ClipboardList } from 'lucide-react';
import { Logo } from './Logo';
import { focusRing } from './ui/focusRing';

export function ActivityBar({ activeView, onSwitchView }: any) {
  const primaryItem = {
    id: 'agent-cells',
    label: 'Agency Console',
    testId: 'activity-home',
    renderIcon: ({ active }: any) => (
      <Logo
        size={24}
        className={`transition-opacity transition-transform duration-500 ${
          active
            ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-110'
            : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
        }`}
      />
    ),
  };

  const items = [
    { id: 'action-sheets', icon: ClipboardList, label: 'Action Sheets' },
    { id: 'explorer', icon: Folder, label: 'Explorer' },
    { id: 'memo', icon: Brain, label: 'Memo' },
  ];

  const bottomItems = [
    { id: 'hierarchy', icon: ListTree, label: 'Hierarchy' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="flex w-12 flex-col items-center justify-between bg-activity-bar py-3 border-r border-activity-bar-border select-none">
      <div className="flex flex-col gap-4 items-center">
        <ActivityItem
          icon={null}
          label={primaryItem.label}
          testId={primaryItem.testId}
          active={activeView === primaryItem.id}
          onClick={() => onSwitchView(primaryItem.id)}
          renderIcon={primaryItem.renderIcon}
        />

        {items.map((item) => (
          <ActivityItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onSwitchView(item.id)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {bottomItems.map((item) => (
          <ActivityItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onSwitchView(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function ActivityItem({ icon: Icon, label, active, onClick, renderIcon, testId }: any) {
  const focusRingClass = focusRing.default;
  return (
    <div className="relative group">
        <button
            type="button"
            onClick={onClick}
            title={label}
            data-testid={testId}
            aria-label={label}
            aria-pressed={active}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${focusRingClass} ${
                active
                ? 'text-primary bg-primary/5 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]'
                : 'text-muted-foreground/50 hover:text-foreground hover:bg-white/5'
            }`}
        >
            {renderIcon
              ? renderIcon({ active })
              : Icon && (
                  <Icon
                    size={20}
                    strokeWidth={active ? 2 : 1.5}
                    aria-hidden="true"
                    className={`transition-transform duration-300 ${
                      active ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  />
                )}
        </button>
        {active && (
            <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse-slow" />
        )}
    </div>
  );
}
