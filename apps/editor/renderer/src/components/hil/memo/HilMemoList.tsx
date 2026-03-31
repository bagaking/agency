import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  Layers,
  Pause,
  Play,
  RefreshCw,
  StickyNote,
  Target,
  Terminal,
} from 'lucide-react';

import { getWorkbenchFileUrl as agencyGetWorkbenchFileUrl } from '../../../services/agencyBridge';
import { focusRing } from '../../ui/focusRing';
import { HilMemoRowAction } from './HilMemoRowAction';

const kindIcons = {
  comment: Terminal,
  memo: StickyNote,
  draft: Layers,
};

const focusRingClass = focusRing.default;

export function HilMemoList({
  visibleInboxItems,
  loading,
  worktreePath,
  onUpdateStatus,
  resolveBody,
  onOpenDetail,
  onOpenReference,
  onReferenceDragStart,
}: any) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
      <div className="flex flex-col gap-0.5">
        {visibleInboxItems.map((item: any, index: number) => (
          <MemoRow
            key={item.id}
            index={index}
            item={item}
            worktreePath={worktreePath}
            onUpdateStatus={onUpdateStatus}
            resolveBody={resolveBody}
            onOpenReference={onOpenReference}
            onReferenceDragStart={onReferenceDragStart}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {!loading && visibleInboxItems.length === 0 && (
        <div className="py-32 flex flex-col items-center justify-center opacity-5">
          <Hash size={64} strokeWidth={1} />
          <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-6">
            Inbox Empty
          </p>
        </div>
      )}
    </div>
  );
}

function MemoRow({ item, index, worktreePath, onUpdateStatus, resolveBody, onOpenDetail, onOpenReference, onReferenceDragStart }: any) {
    const isResolved = item.status === 'resolved' || item.status === 'archived';
    const isProcessed = item.kind === 'comment' && item.meta?.processed === true;
    const isMemoProcessed = item.kind === 'memo' && item.meta?.processed === true;
    const Icon = kindIcons[item.kind] || FileText;
    const bodySummary = resolveBody(item);
    const noteType = item.kind === 'memo' ? item.meta?.noteType : null;
    const noteLabel = noteType ? String(noteType).toUpperCase() : null;
    const voiceAsset = item.kind === 'memo' ? item.meta?.voice?.asset : null;
    
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail?.(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenDetail?.(item);
              }
            }}
            className={`group flex flex-col gap-1 px-4 py-3 rounded-xl transition-colors duration-300 ${focusRingClass} focus-visible:ring-primary/30 ${
                isResolved ? 'opacity-40 grayscale' : 'hover:bg-muted/5'
            }`}
        >
            <div className="flex items-start gap-4">
                {/* Index & Status Dot */}
                <div className="w-8 flex items-center gap-3 shrink-0 pt-0.5">
                    <span className="text-[9px] font-mono text-muted-foreground/30 font-black">{String(index + 1).padStart(2, '0')}</span>
                    <div className={`h-1.5 w-1.5 rounded-full transition-colors transition-shadow duration-700 ${item.status === 'open' ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-muted-foreground/30'}`} />
                </div>

                {/* Content Summary */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        <span className="inline-flex items-center gap-2">
                          <Icon size={13} strokeWidth={1.5} className={!isResolved ? 'text-primary/60' : 'text-muted-foreground/30'} />
                          {item.kind}
                        </span>
                        {noteLabel ? (
                            <span className="rounded-full border border-border/20 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                {noteLabel}
                            </span>
                        ) : null}
                        {isProcessed || isMemoProcessed ? (
                            <span className="rounded-full border border-emerald-500/30 px-1.5 py-0 text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">
                                Done
                            </span>
                        ) : null}
                    </div>
                    <div className="text-[13px] text-muted-foreground/80 leading-snug line-clamp-2 tracking-tight group-hover:text-foreground transition-colors duration-300 font-medium">
                        {bodySummary}
                    </div>
                    {voiceAsset ? (
                        <div className="mt-1">
                          <MemoAudioButton voiceAsset={voiceAsset} worktreePath={worktreePath} />
                        </div>
                    ) : null}
                </div>

                {/* Inline Hover Actions: Zen Style */}
                <div className="mt-0.5 flex items-center gap-1 opacity-0 translate-x-2 transition-opacity transition-transform group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0">
                    {item.status === 'open' ? (
                        <HilMemoRowAction icon={CheckCircle2} title="Resolve" onClick={() => onUpdateStatus(item, 'resolved')} color="hover:text-emerald-500 hover:bg-emerald-500/10" />
                    ) : (
                        <HilMemoRowAction icon={RefreshCw} title="Restore" onClick={() => onUpdateStatus(item, 'open')} color="hover:text-amber-500 hover:bg-amber-500/10" />
                    )}
                    <HilMemoRowAction icon={Archive} title="Archive" onClick={() => onUpdateStatus(item, 'archived')} />
                </div>
            </div>

            {/* Context & Temporal */}
            <div className="ml-12 flex items-center justify-between gap-3 text-[10px] text-muted-foreground/40">
                {item.anchor?.file ? (
                    <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenReference?.({
                            path: item.anchor.file,
                            line: item.anchor.line,
                            column: item.anchor.column,
                          });
                        }}
                        draggable
                        onDragStart={(event) => onReferenceDragStart?.(event, item.anchor.file)}
                        className="flex items-center gap-2 font-mono italic truncate max-w-[220px] group-hover:text-muted-foreground/60 transition-colors hover:text-primary"
                        title={item.anchor.file}
                    >
                        <Target size={10} className="shrink-0" />
                        {item.anchor.file.split('/').pop()}
                        <span className="not-italic opacity-40">:{item.anchor.line}</span>
                    </button>
                ) : (
                    <span className="flex items-center gap-2 italic text-muted-foreground/30">
                      <Clock size={10} className="shrink-0" />
                      Unlinked
                    </span>
                )}
                <div className="font-mono font-bold tabular-nums text-muted-foreground/30">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
            </div>
        </div>
    );
}

export function MemoAudioButton({ voiceAsset, worktreePath }: any) {
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const ensureUrl = useCallback(async () => {
    if (audioUrl || !voiceAsset?.path) {
      return audioUrl;
    }
    const result = await agencyGetWorkbenchFileUrl({
      rootPath: worktreePath || null,
      targetPath: voiceAsset.path,
    });
    const url = result?.url || '';
    setAudioUrl(url);
    return url;
  }, [audioUrl, voiceAsset?.path, worktreePath]);

  const handleToggle = async (event) => {
    event.stopPropagation();
    const url = await ensureUrl();
    if (!url) {
      return;
    }
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }
    if (audioEl.paused) {
      try {
        await audioEl.play();
        setPlaying(true);
      } catch (error) {
        setPlaying(false);
      }
    } else {
      audioEl.pause();
      setPlaying(false);
    }
  };

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return undefined;
    }
    const handleEnded = () => {
      setPlaying(false);
    };
    audioEl.addEventListener('ended', handleEnded);
    return () => {
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1 rounded-md border border-border/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:border-primary/40 hover:text-foreground ${focusRingClass}`}
      >
        {playing ? <Pause size={10} /> : <Play size={10} />}
        {playing ? 'Pause' : 'Play'}
      </button>
      {voiceAsset?.durationMs ? (
        <span className="text-[9px] text-muted-foreground/50">
          {(voiceAsset.durationMs / 1000).toFixed(1)}s
        </span>
      ) : null}
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
}
