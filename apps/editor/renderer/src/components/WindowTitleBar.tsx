import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, Plus, Rows3, Search } from 'lucide-react';

import { Logo } from './Logo';
import { focusRing } from './ui/focusRing';
import type { WindowShellItem } from '../app/useWindowShellState';
import type { AttentionItem } from '../attention/attentionModel';
import { AttentionPill } from './attention/AttentionPill';

type WindowTitleBarProps = {
  projectRoot: string;
  projectError?: string;
  windows: WindowShellItem[];
  onCreateWindow: () => Promise<void> | void;
  onFocusWindow: (windowStateId: string) => Promise<void> | void;
  onSelectProject: () => Promise<void> | void;
};

const focusRingClass = focusRing.dark;

function buildWindowAttentionItem(window: WindowShellItem): AttentionItem | null {
  const primary = window?.attentionSummary?.primary;
  if (!primary) {
    return null;
  }
  return {
    ...primary,
    source: 'window',
    updatedAtMs: 0,
    count: window.attentionSummary?.itemCount || 1,
  };
}

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
  const [activeResultIndex, setActiveResultIndex] = useState(0);
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
      return 'Project Home';
    }
    const parts = normalized.split('/').filter(Boolean);
    return parts[parts.length - 1] || normalized;
  }, [projectRoot]);

  const hasProject = Boolean(String(projectRoot || '').trim());
  const projectEyebrow = projectError
    ? 'Project Needs Attention'
    : hasProject
      ? 'Repository'
      : 'Project Home';
  const projectSubtitle = projectError
    ? projectError
    : hasProject
      ? projectRoot
      : 'Open a repository or keep this window in its window-owned home shell.';
  const projectBadge = projectError ? 'Check' : hasProject ? '' : 'Window-owned';
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
  const currentWindowIndex = useMemo(
    () => filteredWindows.findIndex((window) => window.isFocused),
    [filteredWindows]
  );
  const currentWindow = currentWindowIndex >= 0 ? filteredWindows[currentWindowIndex] : null;
  const otherWindows = useMemo(
    () => filteredWindows.filter((window) => !window.isFocused),
    [filteredWindows]
  );
  const navigableWindows = useMemo(
    () => [...(currentWindow ? [currentWindow] : []), ...otherWindows],
    [currentWindow, otherWindows]
  );
  const attentionWindows = useMemo(
    () => windows.filter((window) => Number(window?.attentionSummary?.itemCount || 0) > 0),
    [windows]
  );

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    if (!navigableWindows.length) {
      setActiveResultIndex(0);
      return;
    }
    setActiveResultIndex((current) => Math.min(current, navigableWindows.length - 1));
  }, [menuOpen, navigableWindows]);

  const handleSelectWindow = async (windowStateId: string) => {
    setMenuOpen(false);
    await onFocusWindow(windowStateId);
  };

  return (
    <header
      data-testid="window-titlebar"
      className={`relative z-40 flex h-11 shrink-0 items-center gap-2.5 border-b border-border/60 bg-[#171b22] text-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] ${
        isMac ? 'pl-[78px]' : 'pl-2.5'
      } pr-2.5`}
    >
      <div
        aria-hidden="true"
        data-testid="window-titlebar-drag-surface"
        className="app-drag-region absolute inset-0"
      />
      <div ref={menuRef} className="app-no-drag relative flex items-center">
        <button
          type="button"
          aria-label="Open window switcher"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          data-testid="window-titlebar-menu-button"
          className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-[10px] font-medium text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <Logo size={14} className="shrink-0" />
          <span className="font-semibold tracking-[0.01em] text-foreground/92">Windows</span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {windows.length}
          </span>
          {attentionWindows.length ? (
            <span
              className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_0_8px_rgba(251,191,36,0.55)]"
              aria-label={`${attentionWindows.length} window${attentionWindows.length === 1 ? '' : 's'} need attention`}
            />
          ) : null}
          <ChevronDown size={11} className={`text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        <button
          type="button"
          aria-label="Open new window"
          onClick={() => {
            void onCreateWindow();
          }}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground/88 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <Plus size={14} className="text-primary" />
        </button>

        {menuOpen ? (
          <div
            data-testid="window-titlebar-menu"
            className="app-no-drag absolute left-0 top-[calc(100%+6px)] z-50 w-[22rem] overflow-hidden rounded-xl border border-white/[0.08] bg-popover/95 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="border-b border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Rows3 size={11} />
                <span>Window Switcher</span>
              </div>
              <div className="mt-1 text-[11px] text-foreground/85">Search, focus, or create another Agency window.</div>
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
                      return;
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActiveResultIndex((current) =>
                        navigableWindows.length ? (current + 1) % navigableWindows.length : 0
                      );
                      return;
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveResultIndex((current) =>
                        navigableWindows.length
                          ? (current - 1 + navigableWindows.length) % navigableWindows.length
                          : 0
                      );
                      return;
                    }
                    if (event.key === 'Enter' && navigableWindows[activeResultIndex]) {
                      event.preventDefault();
                      void handleSelectWindow(navigableWindows[activeResultIndex].windowStateId);
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
                <span className="font-medium">Create New Window</span>
              </button>
            </div>

            <div className="max-h-[18rem] overflow-y-auto border-t border-border/60 p-2">
              {navigableWindows.length ? (
                <div className="space-y-2">
                  {currentWindow ? (
                    <div className="space-y-1">
                      <div className="px-2.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                        Current Window
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSelectWindow(currentWindow.windowStateId);
                        }}
                        data-testid={`window-switcher-item-${currentWindow.windowStateId}`}
                        onMouseEnter={() => {
                          setActiveResultIndex(0);
                        }}
                        className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] ${focusRingClass} ${
                          activeResultIndex === 0 ? 'ring-1 ring-primary/30 bg-white/[0.05]' : 'bg-white/[0.04]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="truncate text-[11px] font-medium text-foreground">
                              {currentWindow.projectName}
                            </div>
                            {buildWindowAttentionItem(currentWindow) ? (
                              <AttentionPill
                                item={buildWindowAttentionItem(currentWindow)}
                                count={currentWindow.attentionSummary?.itemCount || 1}
                                className="shrink-0 px-1.5 py-[2px]"
                              />
                            ) : null}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {currentWindow.projectRoot || 'Empty project window'}
                          </div>
                          {currentWindow.attentionSummary?.primary?.detail ? (
                            <div className="mt-1 truncate text-[10px] text-foreground/60">
                              {currentWindow.attentionSummary.primary.detail}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </div>
                  ) : null}

                  {otherWindows.length ? (
                    <div className="space-y-1">
                      <div className="px-2.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                        Other Windows
                      </div>
                      {otherWindows.map((window, index) => {
                        const navigationIndex = (currentWindow ? 1 : 0) + index;
                        return (
                          <button
                            key={window.windowStateId}
                            type="button"
                            onClick={() => {
                              void handleSelectWindow(window.windowStateId);
                            }}
                            data-testid={`window-switcher-item-${window.windowStateId}`}
                            onMouseEnter={() => {
                              setActiveResultIndex(navigationIndex);
                            }}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] ${focusRingClass} ${
                              activeResultIndex === navigationIndex
                                ? 'ring-1 ring-primary/30 bg-white/[0.05]'
                                : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="truncate text-[11px] font-medium text-foreground">
                                  {window.projectName}
                                </div>
                                {buildWindowAttentionItem(window) ? (
                                  <AttentionPill
                                    item={buildWindowAttentionItem(window)}
                                    count={window.attentionSummary?.itemCount || 1}
                                    className="shrink-0 px-1.5 py-[2px]"
                                  />
                                ) : null}
                              </div>
                              <div className="truncate text-[10px] text-muted-foreground">
                                {window.projectRoot || 'Empty project window'}
                              </div>
                              {window.attentionSummary?.primary?.detail ? (
                                <div className="mt-1 truncate text-[10px] text-foreground/60">
                                  {window.attentionSummary.primary.detail}
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="px-2.5 py-4 text-[11px] text-muted-foreground">
                  {windows.length ? 'No windows match this filter.' : 'No windows available.'}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none relative z-10 min-w-0 flex flex-1 select-none items-center overflow-hidden px-2">
        <div className="mx-auto min-w-0 max-w-[48rem] flex-1">
          <div
            className={`min-w-0 rounded-xl border px-3 py-1.5 ${
              projectError
                ? 'border-rose-400/20 bg-rose-500/[0.06]'
                : 'border-white/[0.06] bg-white/[0.03]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/58">
                {projectEyebrow}
              </div>
              {projectBadge ? (
                <span
                  className={`rounded-full border px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.16em] ${
                    projectError
                      ? 'border-rose-400/20 bg-rose-500/10 text-rose-200/90'
                      : 'border-white/[0.08] bg-white/[0.04] text-muted-foreground/82'
                  }`}
                >
                  {projectBadge}
                </span>
              ) : null}
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <div className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
                <span data-testid="window-titlebar-project-name">{projectName}</span>
              </div>
              <div className="h-1 w-1 shrink-0 rounded-full bg-white/18" />
              <div
                className={`truncate text-[10px] ${
                  projectError ? 'text-rose-100/86' : 'text-muted-foreground'
                }`}
                title={projectSubtitle}
              >
                {projectSubtitle}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="app-no-drag flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectProject()}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[10px] font-semibold text-foreground/90 transition-colors hover:bg-white/[0.08] hover:text-foreground ${focusRingClass}`}
        >
          <FolderOpen size={13} className="text-primary" />
          <span>{hasProject ? 'Switch Project' : 'Open Project'}</span>
        </button>
      </div>
    </header>
  );
}
