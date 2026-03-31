import React from 'react';
import { RefreshCw } from 'lucide-react';
import { RiveAnimation } from './RiveAnimation';
import { useAttentionLayer } from '../attention/AttentionLayerContext';
import { buildNextAttentionTooltip } from '../attention/attentionNavigation';
import { AttentionPill } from './attention/AttentionPill';
import { Tooltip } from './ui/Tooltip';

export function StatusBar({
  loading,
  message = '',
  onRefresh,
  tmuxStatus,
  ipcAvailable,
  centerSlot,
  suppressAttention = false,
}: any) {
  const attention = useAttentionLayer();
  const assetBase =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const tmuxLabel = tmuxStatus?.available ? (tmuxStatus.version || 'tmux') : 'tmux missing';
  const tmuxColor = tmuxStatus?.available ? 'text-emerald-300' : 'text-amber-300';
  const ipcLabel = ipcAvailable ? 'IPC ready' : 'IPC missing';
  const ipcColor = ipcAvailable ? 'text-emerald-300' : 'text-rose-300';

  const primaryAttention = attention.primaryItem;
  const attentionCount = primaryAttention
    ? primaryAttention.source === 'window'
      ? primaryAttention.count
      : attention.localSummary.itemCount
    : 0;
  const nextAttentionTooltip = primaryAttention
    ? buildNextAttentionTooltip(primaryAttention)
    : '';

  return (
    <footer className="relative flex h-6 w-full items-center justify-between bg-status-bar px-3 text-xs text-status-bar-foreground select-none overflow-hidden">
      <div className="flex items-center gap-3">
        <button 
            onClick={onRefresh} 
            className={`flex items-center gap-1.5 hover:opacity-80 transition-opacity ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
            title="Refresh cells"
            data-testid="refresh-cells"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Cells</span>
        </button>
        <span className={`border-l border-status-bar-foreground/20 pl-3 ${tmuxColor}`} title={tmuxStatus?.error || tmuxLabel}>
          {tmuxLabel}
        </span>
        <span className={`border-l border-status-bar-foreground/20 pl-3 ${ipcColor}`} title={ipcLabel}>
          {ipcLabel}
        </span>
        {message && <span className="opacity-80 border-l border-status-bar-foreground/20 pl-3">Process: {message}</span>}
      </div>

      {centerSlot ? (
        <div className="absolute left-1/2 -translate-x-1/2">
          {centerSlot}
        </div>
      ) : null}

      <div className="flex items-center gap-3 opacity-90">
        {!suppressAttention && primaryAttention ? (
          <Tooltip label={nextAttentionTooltip} side="top">
            <button
              type="button"
              onClick={() => attention.jumpToAttention(primaryAttention)}
              data-testid="statusbar-attention"
              className="flex max-w-[320px] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 transition-colors hover:bg-white/[0.08]"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-status-bar-foreground/58">
                Next
              </span>
              <AttentionPill item={primaryAttention} count={attentionCount} className="px-1.5 py-[2px]" />
              <span className="truncate text-[10px] text-status-bar-foreground/92">
                {primaryAttention.label}
              </span>
            </button>
          </Tooltip>
        ) : null}
        <span>UTF-8</span>
        <span>Javascript</span>
        <div className="flex items-center justify-center w-4 h-4">
             {loading ? (
                 <RiveAnimation 
                    src={`${assetBase}assets/animations/loader.riv`} 
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
