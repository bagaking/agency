import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FolderOpen, Plus, Rows3, Search } from 'lucide-react';

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
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  useEffect(() => {
    if (menuOpen) {
      const handlePointerDown = (event: PointerEvent) => {
        if (!menuRef.current?.contains(event.target as Node)) {
          setMenuOpen(false);
        }
      };
      document.addEventListener('pointerdown', handlePointerDown);
      const frameId = window.requestAnimationFrame(() => {
        queryInputRef.current?.focus();
      });
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        window.cancelAnimationFrame(frameId);
      };
    }
    setQuery('');
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
  const windowCountLabel = windows.length === 1 ? '1 window open' : `${windows.length} windows open`;
  const filteredWindows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return windows;
    }
    return windows.filter((window) => {
      return [window.projectName, window.projectRoot, window.title]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [query, windows]);

  return (
    <header
      className={`app-drag-region relative z-20 flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-[#171b22] text-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] ${
        isMac ? 'pl-[82px]' : 'pl-2.5'
      } pr-2.5`}
    >
      <div ref={menuRef} className="app-no-drag relative flex items-center">
        <button
          type="button"
          aria-label="Find window"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[10px] font-medium text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <Logo size={14} className="shrink-0" />
          <Search size={11} className="text-muted-foreground" />
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {windows.length}
          </span>
          <ChevronDown size={11} className={`text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen ? (
          <div className="app-no-drag absolute left-0 top-[calc(100%+6px)] z-30 w-[22rem] overflow-hidden rounded-xl border border-white/[0.08] bg-popover/95 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="border-b border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Rows3 size={11} />
                <span>Find Window</span>
              </div>
              <div className="mt-1 text-[11px] text-foreground/85">
                {windowCountLabel}. Current window is marked below.
              </div>
            </div>

            <div className="border-b border-border/60 p-2">
              <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-[11px] text-muted-foreground">
                <Search size={13} />
                <input
                  ref={queryInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setMenuOpen(false);
                    }
                  }}
                  placeholder="Filter by project or path"
                  className="w-full border-0 bg-transparent p-0 text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
              </label>
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
              {filteredWindows.length ? (
                filteredWindows.map((window) => (
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
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {window.isFocused ? <Check size={14} className="text-primary" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[11px] font-medium text-foreground">
                          {window.projectName}
                        </div>
                        {window.isFocused ? (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {window.projectRoot || 'Empty project window'}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-2.5 py-4 text-[11px] text-muted-foreground">
                  {windows.length ? 'No windows match this filter.' : 'No windows available.'}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex flex-1 items-center gap-2 overflow-hidden">
        <div className="truncate text-[11px] font-semibold tracking-[0.01em] text-foreground">
          {projectName}
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {windowCountLabel}
        </span>
        <div className="truncate text-[10px] text-muted-foreground">{projectSubtitle}</div>
      </div>

      <div className="app-no-drag flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectProject()}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 text-[10px] font-medium text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <FolderOpen size={13} className="text-primary" />
          <span>{projectRoot ? 'Switch Project' : 'Open Project'}</span>
        </button>
      </div>
    </header>
  );
}
