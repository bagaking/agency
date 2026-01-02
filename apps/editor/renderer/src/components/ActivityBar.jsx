import React from 'react';
import { Settings, ListTree, Folder } from 'lucide-react';
import { Logo } from './Logo.jsx';

export function ActivityBar({ activeView, onSwitchView }) {
  const items = [
    { id: 'explorer', icon: Folder, label: 'Explorer' },
    { id: 'hierarchy', icon: ListTree, label: 'Hierarchy' },
  ];

  const bottomItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="flex w-12 flex-col items-center justify-between bg-activity-bar py-3 border-r border-activity-bar-border">
      <div className="flex flex-col gap-4 items-center">
        <button
          type="button"
          onClick={() => onSwitchView('agent-cells')}
          title="Home"
          data-testid="activity-home"
          className="mb-2 flex items-center justify-center"
        >
          <Logo size={28} className="hover:scale-110 transition-transform" />
        </button>
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

function ActivityItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
        active
          ? 'text-activity-bar-active'
          : 'text-activity-bar-foreground hover:text-activity-bar-active'
      }`}
    >
      <Icon size={24} strokeWidth={1.5} />
      {active && (
        <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
    </button>
  );
}
