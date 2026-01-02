import React from 'react';
import { Settings, ListTree, Folder } from 'lucide-react';
import { Logo } from './Logo.jsx';

export function ActivityBar({ activeView, onSwitchView }) {
  const items = [
    { id: 'explorer', icon: Folder, label: 'Explorer' },
  ];

  const bottomItems = [
    { id: 'hierarchy', icon: ListTree, label: 'Hierarchy' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="flex w-12 flex-col items-center justify-between bg-activity-bar py-3 border-r border-activity-bar-border select-none">
      <div className="flex flex-col gap-4 items-center">
        <div className="relative group">
            <button
                type="button"
                onClick={() => onSwitchView('agent-cells')}
                title="Agency Console"
                data-testid="activity-home"
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    activeView === 'agent-cells' ? 'bg-primary/10 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' : 'hover:bg-white/5'
                }`}
            >
                <Logo size={24} className={`transition-all duration-500 ${activeView === 'agent-cells' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-110' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`} />
            </button>
            {activeView === 'agent-cells' && (
                <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse-slow" />
            )}
        </div>

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
    <div className="relative group">
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                active
                ? 'text-primary bg-primary/5 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]'
                : 'text-muted-foreground/50 hover:text-foreground hover:bg-white/5'
            }`}
        >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
        </button>
        {active && (
            <div className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse-slow" />
        )}
    </div>
  );
}
