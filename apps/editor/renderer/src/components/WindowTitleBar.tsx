import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FolderOpen, Plus, Rows3 } from 'lucide-react';

import { Logo } from './Logo';
import { focusRing } from './ui/focusRing';
import type { WindowShellItem } from '../app/useWindowShellState';

type WindowTitleBarProps = {
  projectRoot: string;
  projectError?: string;
  windows: WindowShellItem[];
  onCreateWindow: () => Promise<void> | void;
  onFocusWindow: (windowStateId: string) => Promise<void> | void;
  onSelectProject: () => Promise<void> | void;
};

const focusRingClass = focusRing.dark;

export function WindowTitleBar({
  projectRoot,
  projectError = '',
  windows,
  onCreateWindow,
  onFocusWindow,
  onSelectProject,
}: WindowTitleBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  const projectName = useMemo(() => {
    const normalized = String(projectRoot || '').trim();
    if (!normalized) {
      return 'No Project';
    }
    const parts = normalized.split('/').filter(Boolean);
    return parts[parts.length - 1] || normalized;
  }, [projectRoot]);

  const projectSubtitle = projectRoot || projectError || 'Open a repository to start an Agency workspace.';
  const windowCountLabel = windows.length === 1 ? '1 window' : `${windows.length} windows`;

  return (
    <header
      className={`app-drag-region relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-[#171b22] text-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] ${
        isMac ? 'pl-[84px]' : 'pl-3'
      } pr-3`}
    >
      <div ref={menuRef} className="app-no-drag relative flex items-center">
        <button
          type="button"
          aria-label="Open window switcher"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-[11px] font-medium text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <Logo size={16} className="shrink-0" />
          <Rows3 size={12} className="text-muted-foreground" />
          <ChevronDown size={12} className={`text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen ? (
          <div className="app-no-drag absolute left-0 top-[calc(100%+8px)] z-30 w-[22rem] overflow-hidden rounded-xl border border-white/[0.08] bg-popover/95 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="border-b border-border/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Windows
              </div>
              <div className="mt-1 text-[11px] text-foreground/85">{windowCountLabel}</div>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  await onCreateWindow();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-foreground/90 transition-colors hover:bg-white/[0.06] ${focusRingClass}`}
              >
                <Plus size={14} className="text-primary" />
                <span className="font-medium">New Window</span>
              </button>
            </div>

            <div className="max-h-[18rem] overflow-y-auto border-t border-border/60 p-2">
              {windows.length ? (
                windows.map((window) => (
                  <button
                    key={window.windowStateId}
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await onFocusWindow(window.windowStateId);
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] ${focusRingClass} ${
                      window.isFocused ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <div className="mt-0.5 h-4 w-4 shrink-0">
                      {window.isFocused ? <Check size={14} className="text-primary" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-foreground">
                        {window.projectName}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {window.projectRoot || 'Empty project window'}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-2.5 py-4 text-[11px] text-muted-foreground">No windows available.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
          {projectName}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">{projectSubtitle}</div>
      </div>

      <div className="app-no-drag flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectProject()}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[11px] font-medium text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <FolderOpen size={14} className="text-primary" />
          <span>{projectRoot ? 'Switch Project' : 'Open Project'}</span>
        </button>

        <button
          type="button"
          onClick={() => onCreateWindow()}
          className={`inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 ${focusRingClass}`}
        >
          <Plus size={14} />
          <span>New Window</span>
        </button>
      </div>
    </header>
  );
}
