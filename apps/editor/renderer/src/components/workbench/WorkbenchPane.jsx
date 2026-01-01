import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  FileText,
  Pin,
  PinOff,
  X,
  RefreshCw,
  GitCompare,
  GitCommit,
  Save,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView.jsx';
import { MediaWorkbenchView } from './MediaWorkbenchView.jsx';
import { QuickOpenModal } from './QuickOpenModal.jsx';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';

const languageFromPath = (filePath) => {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'js':
    case 'cjs':
    case 'mjs':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'java':
      return 'java';
    case 'rb':
      return 'ruby';
    case 'sh':
    case 'bash':
      return 'shell';
    default:
      return 'plaintext';
  }
};

const formatBytes = (value) => {
  if (!value && value !== 0) {
    return '';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const buildBreadcrumbs = (path) => path.split('/').filter(Boolean);

export function WorkbenchPane({
  workbench,
  activeRootPath,
  activeRootLabel,
  onTabMetaChange,
  cellId,
  projectReady,
  projectError,
  onSelectProject,
}) {
  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Choose a project directory to browse and edit files."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }
  const {
    tabs,
    activeTab,
    openFile,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    pinTab,
    reorderTabs,
    setActiveTab,
  } = workbench;

  const [tabStateById, setTabStateById] = useState({});
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [statusPosition, setStatusPosition] = useState({ line: 1, column: 1 });
  const [tabMenu, setTabMenu] = useState(null);
  const dragSourceRef = useRef(null);
  const tabMetaRef = useRef({});

  const activeState = activeTab ? tabStateById[activeTab.id] || {} : {};
  const diffSummary = useMemo(() => {
    if (!activeState.diffHunks || !activeState.diffHunks.length) {
      return null;
    }
    let added = 0;
    let deleted = 0;
    let modified = 0;
    activeState.diffHunks.forEach((hunk) => {
      if (hunk.type === 'add') {
        added += hunk.newCount || 0;
      } else if (hunk.type === 'delete') {
        deleted += hunk.oldCount || 0;
      } else {
        modified += hunk.newCount || 0;
      }
    });
    return { added, deleted, modified };
  }, [activeState.diffHunks]);

  const updateTabState = useCallback((tabId, updates) => {
    setTabStateById((current) => ({
      ...current,
      [tabId]: {
        ...(current[tabId] || {}),
        ...updates,
      },
    }));
  }, []);

  const reportTabMeta = useCallback(() => {
    if (!onTabMetaChange) {
      return;
    }
    const next = {};
    tabs.forEach((tab) => {
      const state = tabStateById[tab.id] || {};
      next[tab.path] = {
        dirty: Boolean(state.isDirty),
      };
    });
    const prev = tabMetaRef.current;
    const nextKeys = Object.keys(next);
    const prevKeys = Object.keys(prev);
    let changed = nextKeys.length !== prevKeys.length;
    if (!changed) {
      for (const key of nextKeys) {
        if (!prev[key] || prev[key].dirty !== next[key].dirty) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      tabMetaRef.current = next;
      onTabMetaChange(cellId || 'repo', next);
    }
  }, [cellId, onTabMetaChange, tabStateById, tabs]);

  useEffect(() => {
    reportTabMeta();
  }, [reportTabMeta]);

  const loadTab = useCallback(
    async (tab) => {
      if (!tab || !window.agency) {
        return;
      }
      updateTabState(tab.id, {
        loading: true,
        error: '',
        kind: tab.kind,
        needsReload: false,
        fallback: false,
      });
      try {
        if (['image', 'video', 'audio', 'pdf'].includes(tab.kind)) {
          const [meta, urlResult] = await Promise.all([
            window.agency.statWorkbenchEntry({ rootPath: tab.rootPath, targetPath: tab.path }),
            window.agency.getWorkbenchFileUrl({ rootPath: tab.rootPath, targetPath: tab.path }),
          ]);
          updateTabState(tab.id, {
            loading: false,
            fileUrl: urlResult?.url || '',
            size: meta?.size || 0,
            mtimeMs: meta?.mtimeMs || 0,
            kind: tab.kind,
          });
          return;
        }
        const result = await window.agency.readWorkbenchEntry({
          rootPath: tab.rootPath,
          targetPath: tab.path,
        });
        updateTabState(tab.id, {
          loading: false,
          content: result?.content || '',
          size: result?.size || 0,
          mtimeMs: result?.mtimeMs || 0,
          binary: Boolean(result?.binary),
          truncated: Boolean(result?.truncated),
          kind: result?.binary ? 'binary' : tab.kind,
          language: languageFromPath(tab.path),
          isDirty: false,
        });
      } catch (error) {
        const message = error?.message || 'Failed to load file.';
        const shouldFallback =
          message.includes('No handler registered for') &&
          message.includes('workbench:read') &&
          window.agency?.readExplorerEntry;
        if (shouldFallback) {
          try {
            const fallback = await window.agency.readExplorerEntry({
              rootPath: tab.rootPath,
              targetPath: tab.path,
            });
            updateTabState(tab.id, {
              loading: false,
              content: fallback?.content || '',
              size: fallback?.size || 0,
              mtimeMs: fallback?.mtimeMs || 0,
              binary: Boolean(fallback?.binary),
              truncated: Boolean(fallback?.truncated),
              kind: fallback?.binary ? 'binary' : tab.kind,
              language: languageFromPath(tab.path),
              isDirty: false,
              fallback: true,
            });
            return;
          } catch (fallbackError) {
            updateTabState(tab.id, {
              loading: false,
              error: fallbackError?.message || message,
            });
            return;
          }
        }
        updateTabState(tab.id, {
          loading: false,
          error: message,
        });
      }
    },
    [updateTabState]
  );

  useEffect(() => {
    if (!activeTab) {
      return;
    }
    const state = tabStateById[activeTab.id];
    if (!state || (!state.loading && state.content == null && !state.fileUrl && !state.error)) {
      loadTab(activeTab);
    }
  }, [activeTab, loadTab, tabStateById]);

  useEffect(() => {
    if (!activeTab || !window.agency?.statWorkbenchEntry) {
      return undefined;
    }
    const interval = setInterval(async () => {
      const state = tabStateById[activeTab.id];
      if (!state || !state.mtimeMs) {
        return;
      }
      try {
        const meta = await window.agency.statWorkbenchEntry({
          rootPath: activeTab.rootPath,
          targetPath: activeTab.path,
        });
        if (meta?.mtimeMs && meta.mtimeMs !== state.mtimeMs) {
          updateTabState(activeTab.id, { needsReload: true });
        }
      } catch (error) {
        updateTabState(activeTab.id, { needsReload: true });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, tabStateById, updateTabState]);

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeState || !window.agency?.writeWorkbenchEntry) {
      return;
    }
    if (activeState.fallback) {
      return;
    }
    if (activeState.kind !== 'code') {
      return;
    }
    if (activeState.truncated) {
      return;
    }
    updateTabState(activeTab.id, { saving: true });
    try {
      const result = await window.agency.writeWorkbenchEntry({
        rootPath: activeTab.rootPath,
        targetPath: activeTab.path,
        content: activeState.content || '',
      });
      updateTabState(activeTab.id, {
        saving: false,
        isDirty: false,
        mtimeMs: result?.mtimeMs || activeState.mtimeMs,
        needsReload: false,
      });
    } catch (error) {
      updateTabState(activeTab.id, {
        saving: false,
        error: error?.message || 'Failed to save file.',
      });
    }
  }, [activeState, activeTab, updateTabState]);

  const handleReload = useCallback(() => {
    if (activeTab) {
      loadTab(activeTab);
    }
  }, [activeTab, loadTab]);

  const toggleDiff = useCallback(async () => {
    if (!activeTab || !window.agency?.diffWorkbenchEntry) {
      return;
    }
    const enabled = !activeState.diffEnabled;
    updateTabState(activeTab.id, { diffEnabled: enabled });
    if (enabled && !activeState.diffHunks) {
      try {
        const result = await window.agency.diffWorkbenchEntry({
          rootPath: activeTab.rootPath,
          targetPath: activeTab.path,
        });
        updateTabState(activeTab.id, {
          diffHunks: result?.hunks || [],
          diffTruncated: Boolean(result?.truncated),
        });
      } catch (error) {
        updateTabState(activeTab.id, {
          diffError: error?.message || 'Failed to load diff.',
        });
      }
    }
  }, [activeState, activeTab, updateTabState]);

  const toggleBlame = useCallback(async () => {
    if (!activeTab || !window.agency?.blameWorkbenchEntry) {
      return;
    }
    const enabled = !activeState.blameEnabled;
    updateTabState(activeTab.id, { blameEnabled: enabled });
    if (enabled && !activeState.blameLines) {
      try {
        const result = await window.agency.blameWorkbenchEntry({
          rootPath: activeTab.rootPath,
          targetPath: activeTab.path,
        });
        updateTabState(activeTab.id, {
          blameLines: result?.lines || [],
          blameTruncated: Boolean(result?.truncated),
        });
      } catch (error) {
        updateTabState(activeTab.id, {
          blameError: error?.message || 'Failed to load blame.',
        });
      }
    }
  }, [activeState, activeTab, updateTabState]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          handleSave();
        }
        if (event.key.toLowerCase() === 'p') {
          event.preventDefault();
          setQuickOpenVisible(true);
        }
      }
    },
    [handleSave]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!tabMenu) {
      return undefined;
    }
    const handleClick = (event) => {
      if (event.target.closest('[data-workbench-tab-menu]')) {
        return;
      }
      setTabMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tabMenu]);

  const breadcrumbs = activeTab ? buildBreadcrumbs(activeTab.path) : [];

  const handleTabDragStart = (tabId) => {
    dragSourceRef.current = tabId;
  };

  const handleTabDrop = (tabId) => {
    const sourceId = dragSourceRef.current;
    if (!sourceId) {
      return;
    }
    reorderTabs(sourceId, tabId);
    dragSourceRef.current = null;
  };

  const handleOpenQuickFile = (path) => {
    openFile({ path, mode: 'preview', rootPath: activeRootPath });
    setQuickOpenVisible(false);
  };

  return (
    <section className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText size={14} className="opacity-70" />
          <span className="font-semibold text-foreground">{activeRootLabel || 'Workbench'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 hover:text-foreground"
            onClick={() => setQuickOpenVisible(true)}
            title="Quick Open (Cmd/Ctrl+P)"
          >
            <Search size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border bg-card px-2 py-1">
        <div className="flex flex-1 items-center overflow-x-auto">
          {tabs.length === 0 ? (
            <div className="px-2 text-xs text-muted-foreground">No open files</div>
          ) : (
            <div className="flex items-center gap-1" data-testid="workbench-tabs">
              {tabs.map((tab) => {
                const state = tabStateById[tab.id] || {};
                const isActive = activeTab?.id === tab.id;
                return (
                  <div
                    key={tab.id}
                    data-workbench-tab={tab.path}
                    className={`group flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                      isActive ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    draggable
                    onDragStart={() => handleTabDragStart(tab.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleTabDrop(tab.id)}
                    onClick={() => setActiveTab(tab.id)}
                    onDoubleClick={() => pinTab(tab.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setTabMenu({ x: event.clientX, y: event.clientY, tabId: tab.id });
                    }}
                    title={tab.path}
                  >
                    <span className={tab.isPreview ? 'italic' : ''}>{tab.title}</span>
                    {state.isDirty ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {activeTab ? (
          <div className="flex items-center gap-1">
            {activeState.kind === 'code' ? (
              <>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-[10px] ${
                    activeState.diffEnabled
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                  onClick={toggleDiff}
                  title="Toggle diff decorations"
                  disabled={activeState.fallback}
                >
                  <GitCompare size={12} />
                </button>
                <button
                  type="button"
                  className={`rounded border px-2 py-1 text-[10px] ${
                    activeState.blameEnabled
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                  onClick={toggleBlame}
                  title="Toggle blame"
                  disabled={activeState.fallback}
                >
                  <GitCommit size={12} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => (activeTab.isPreview ? pinTab(activeTab.id) : null)}
              title={activeTab.isPreview ? 'Pin tab' : 'Pinned'}
            >
              {activeTab.isPreview ? <Pin size={12} /> : <PinOff size={12} />}
            </button>
          </div>
        ) : null}
      </div>

      {activeTab ? (
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 text-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="flex items-center gap-1">
                <span className={index === breadcrumbs.length - 1 ? 'font-semibold' : ''}>
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activeState.needsReload ? (
              <span className="flex items-center gap-1 text-amber-200/80">
                <AlertTriangle size={12} />
                File changed on disk
              </span>
            ) : null}
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:text-foreground"
              onClick={handleReload}
              title="Reload file"
            >
              <RefreshCw size={12} />
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 hover:text-foreground"
              onClick={handleSave}
              title="Save (Cmd/Ctrl+S)"
              disabled={!activeState.isDirty || activeState.truncated || activeState.fallback}
            >
              <Save size={12} />
            </button>
          </div>
        </div>
      ) : null}

      {activeTab && (activeState.diffError || activeState.blameError) ? (
        <div className="border-b border-border bg-card px-4 py-2 text-xs text-rose-300">
          {activeState.diffError || activeState.blameError}
        </div>
      ) : null}
      {activeTab && activeState.fallback ? (
        <div className="border-b border-border bg-card px-4 py-2 text-xs text-amber-200/80">
          Workbench IPC unavailable. Restart the main process to enable save, diff, and blame.
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        {!activeTab ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a file in Explorer to open it here.
          </div>
        ) : activeState.loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : activeState.error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-300">
            {activeState.error}
          </div>
        ) : activeState.kind === 'code' ? (
          <CodeWorkbenchView
            value={activeState.content || ''}
            language={activeState.language || 'plaintext'}
            diffHunks={activeState.diffEnabled ? activeState.diffHunks || [] : []}
            diffTruncated={activeState.diffTruncated}
            blameEnabled={activeState.blameEnabled}
            blameLines={activeState.blameEnabled ? activeState.blameLines || [] : []}
            readOnly={activeState.truncated}
            onChange={(value) => {
              updateTabState(activeTab.id, {
                content: value,
                isDirty: true,
              });
            }}
            onCursorChange={(position) => setStatusPosition(position)}
          />
        ) : (
          <MediaWorkbenchView
            kind={activeState.kind}
            fileUrl={activeState.fileUrl}
            size={activeState.size}
            onReload={handleReload}
          />
        )}
      </div>

      {activeTab ? (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Ln {statusPosition.line}, Col {statusPosition.column}
            </span>
            {activeState.truncated ? (
              <span className="text-amber-200/80">Preview truncated</span>
            ) : null}
            {activeState.binary ? (
              <span className="text-rose-300">Binary file</span>
            ) : null}
            {activeState.fallback ? (
              <span className="text-amber-200/80">Workbench IPC unavailable</span>
            ) : null}
            {activeState.blameTruncated ? (
              <span className="text-amber-200/80">Blame truncated</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span>{activeState.language || 'plaintext'}</span>
            {activeState.diffEnabled && diffSummary ? (
              <span className="text-muted-foreground/70">
                +{diffSummary.added}/-{diffSummary.deleted}
              </span>
            ) : null}
            <span>{formatBytes(activeState.size)}</span>
          </div>
        </div>
      ) : null}

      <QuickOpenModal
        open={quickOpenVisible}
        onClose={() => setQuickOpenVisible(false)}
        onSelect={handleOpenQuickFile}
        rootPath={activeRootPath}
      />

      {tabMenu ? (
        <div
          data-workbench-tab-menu
          className="fixed z-[70] w-40 rounded border border-border bg-popover py-1 text-[11px] shadow-xl"
          style={{ top: tabMenu.y, left: tabMenu.x }}
        >
          <button
            type="button"
            className="flex w-full items-center px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              closeTab(tabMenu.tabId);
              setTabMenu(null);
            }}
          >
            Close
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              closeOtherTabs(tabMenu.tabId);
              setTabMenu(null);
            }}
          >
            Close Others
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              closeAllTabs();
              setTabMenu(null);
            }}
          >
            Close All
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              pinTab(tabMenu.tabId);
              setTabMenu(null);
            }}
          >
            Pin Tab
          </button>
        </div>
      ) : null}
    </section>
  );
}
