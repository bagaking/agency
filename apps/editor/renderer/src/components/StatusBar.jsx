import React from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { RiveAnimation } from './RiveAnimation.jsx';

export function StatusBar({ loading, message, onRefresh, tmuxStatus }) {
  const tmuxLabel = tmuxStatus?.available ? (tmuxStatus.version || 'tmux') : 'tmux missing';
  const tmuxColor = tmuxStatus?.available ? 'text-emerald-300' : 'text-amber-300';

  return (
    <footer className="flex h-6 w-full items-center justify-between bg-status-bar px-3 text-xs text-status-bar-foreground select-none overflow-hidden">
      <div className="flex items-center gap-3">
        <button 
            onClick={onRefresh} 
            className={`flex items-center gap-1.5 hover:opacity-80 transition-opacity ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
            title="Refresh State"
            data-testid="refresh-cells"
        >
          <Radio size={12} />
          <span>Agency Remote</span>
        </button>
        <span className={`border-l border-status-bar-foreground/20 pl-3 ${tmuxColor}`} title={tmuxStatus?.error || tmuxLabel}>
          {tmuxLabel}
        </span>
        {message && <span className="opacity-80 border-l border-status-bar-foreground/20 pl-3">Process: {message}</span>}
      </div>
      
      <div className="flex items-center gap-4 opacity-90">
        <span>UTF-8</span>
        <span>Javascript</span>
        <div className="flex items-center justify-center w-4 h-4">
             {loading ? (
                 <RiveAnimation 
                    src="/assets/animations/loader.riv" 
                    animations="Timeline 1"
                    className="w-4 h-4"
                    fallback={<RefreshCw size={10} className="animate-spin" />}
                 />
             ) : (
                 <div className="w-1.5 h-1.5 rounded-full bg-status-bar-foreground/50" />
             )}
        </div>
      </div>
    </footer>
  );
}
