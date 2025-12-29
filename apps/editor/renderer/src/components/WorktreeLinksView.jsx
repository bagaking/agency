import React, { useMemo, useState } from 'react';
import { Link2, Plus, RefreshCw, Save, Trash2, Wand2, Settings2, Table as TableIcon, Info, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const statusMeta = {
  linked: {
    label: 'Linked',
    icon: CheckCircle2,
    className: 'text-emerald-400',
  },
  missing: {
    label: 'Missing',
    icon: AlertCircle,
    className: 'text-amber-400',
  },
  conflict: {
    label: 'Conflict',
    icon: XCircle,
    className: 'text-rose-400',
  },
  'source-missing': {
    label: 'Source missing',
    icon: XCircle,
    className: 'text-rose-400',
  },
};

export function WorktreeLinksView({
  links,
  autoLinkOnCreate,
  candidates,
  statusesByPath,
  configPath,
  selectedCell,
  cells,
  repoRoot,
  loading,
  error,
  dirty,
  onToggleAuto,
  onAddLink,
  onAddFromCandidate,
  onUpdateLink,
  onRemoveLink,
  onApplyLink,
  onApplyAll,
  onSave,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('matrix'); // matrix, config

  const sortedCells = useMemo(() => {
    return [...(cells || [])].sort((a, b) => {
      if (a.worktreePath === repoRoot) return -1;
      if (b.worktreePath === repoRoot) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [cells, repoRoot]);

  return (
    <section className="flex h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Softlinks</h2>
            {dirty && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200 border border-amber-500/20">Unsaved</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Manage symbolic links for untracked directories across all agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading || !dirty}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </header>

      <div className="flex border-b border-border px-6">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'matrix'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TableIcon size={14} />
          Status Matrix
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'config'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings2 size={14} />
          Configurations
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {activeTab === 'matrix' ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 border-b border-border">Agent</th>
                    {links.map(link => (
                      <th key={link.id} className="px-4 py-3 border-b border-border border-l">
                        {link.label || link.id}
                      </th>
                    ))}
                    <th className="px-4 py-3 border-b border-border border-l text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedCells.map(cell => {
                    const isMain = cell.worktreePath === repoRoot;
                    const cellStatuses = statusesByPath?.[cell.worktreePath] || [];
                    const statusMap = new Map(cellStatuses.map(s => [s.id, s]));

                    return (
                      <tr key={cell.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{cell.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]" title={cell.worktreePath}>
                            {isMain ? '(Main Repo)' : cell.worktreePath}
                          </div>
                        </td>
                        {links.map(link => {
                          const status = statusMap.get(link.id);
                          const meta = statusMeta[status?.status] || statusMeta.missing;
                          const Icon = meta.icon;

                          if (isMain) {
                            return (
                              <td key={link.id} className="px-4 py-3 border-l border-border text-muted-foreground/50 italic">
                                Source
                              </td>
                            );
                          }

                          return (
                            <td key={link.id} className="px-4 py-3 border-l border-border">
                              <div className={`flex items-center gap-1.5 ${meta.className}`}>
                                <Icon size={12} />
                                <span>{meta.label}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 border-l border-border text-right">
                          {!isMain && (
                            <button
                              onClick={() => onApplyAll?.({ worktreePath: cell.worktreePath })}
                              className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                              disabled={loading}
                            >
                              <Wand2 size={12} />
                              Link All
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200/80 leading-relaxed">
              <p className="font-medium text-blue-200 mb-1">About Status Matrix</p>
              The matrix shows the link status for each agent.
              <strong> Main Repo</strong> contains the actual directories and doesn't need linking.
              Use <strong>Link All</strong> to create all missing symbolic links for a specific agent.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl">
            <div className="rounded-lg border border-border bg-card/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Automatic Linking</div>
                  <div className="text-xs text-muted-foreground">
                    Create configured links automatically when creating new agents.
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={autoLinkOnCreate}
                    onChange={(e) => onToggleAuto?.(e.target.checked)}
                  />
                  <div className="peer h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-full"></div>
                  <span className="ml-3 text-xs font-medium text-muted-foreground">Enabled</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Configured Links</h3>
                <button
                  type="button"
                  onClick={onAddLink}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                >
                  <Plus size={14} />
                  Add New Link
                </button>
              </div>

              {links.length > 0 ? (
                <div className="grid gap-4">
                  {links.map((link) => (
                    <div key={link.id} className="group relative rounded-lg border border-border bg-card/30 p-4 transition-all hover:border-primary/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Label</label>
                          <input
                            className="w-full rounded border border-border bg-background/50 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                            value={link.label || ''}
                            onChange={(e) => onUpdateLink?.(link.id, { label: e.target.value })}
                            placeholder="e.g. Codex"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Source (Relative to Root)</label>
                          <input
                            className="w-full rounded border border-border bg-background/50 px-2 py-1.5 text-sm font-mono focus:border-primary focus:outline-none"
                            value={link.source || ''}
                            onChange={(e) => onUpdateLink?.(link.id, { source: e.target.value })}
                            placeholder=".codex"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Target (Relative to Worktree)</label>
                          <input
                            className="w-full rounded border border-border bg-background/50 px-2 py-1.5 text-sm font-mono focus:border-primary focus:outline-none"
                            value={link.target || ''}
                            onChange={(e) => onUpdateLink?.(link.id, { target: e.target.value })}
                            placeholder=".codex"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveLink?.(link.id)}
                        className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No links configured. Add one or pick from candidates below.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Discovery</h3>
              <div className="text-xs text-muted-foreground mb-2">Detected untracked or ignored directories that might need linking.</div>
              {candidates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidates.map((candidate) => {
                    const alreadyAdded = links.some(l => l.source === candidate);
                    return (
                      <button
                        key={candidate}
                        onClick={() => !alreadyAdded && onAddFromCandidate?.(candidate)}
                        disabled={alreadyAdded}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all ${
                          alreadyAdded 
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 opacity-60' 
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <span className="font-mono">{candidate}</span>
                        {alreadyAdded ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No candidates found.</div>
              )}
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="text-[10px] text-muted-foreground font-mono truncate">
                Config Path: {configPath}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
