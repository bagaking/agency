import React, { useEffect, useMemo, useState } from 'react';
import 'xterm/css/xterm.css';
import { ActivityBar } from './components/ActivityBar.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { StatusBar } from './components/StatusBar.jsx';
import { EditorPane } from './components/EditorPane.jsx';

const defaultCells = [
  {
    id: 'sample-cell',
    name: 'sample-cell',
    branch: 'feature/sample-cell',
    worktreePath: '',
    state: 'draft',
    validation: { warnings: ['Spec file not found (temporary validation).'] },
  },
];

const branchPrefixes = ['feat', 'refactor', 'fix', 'lint', 'chore', 'doc'];
const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;
const toBranchSlug = (value) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'cell';
};

function App() {
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  // Terminal State
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
  
  // View State
  const [activeView, setActiveView] = useState('explorer'); // explorer, settings

  const selectedCell = useMemo(
    () => cells.find((cell) => cell.id === selectedId),
    [cells, selectedId]
  );

  const loadCells = async () => {
    setLoading(true);
    try {
      if (window.agency && window.agency.listCells) {
        const result = await window.agency.listCells();
        setCells(result);
        if (result.length && !selectedId) {
          setSelectedId(result[0].id);
        }
      } else {
        setCells(defaultCells);
        if (!selectedId) setSelectedId(defaultCells[0].id);
      }
    } catch (error) {
      console.error(error);
      setCells(defaultCells);
      if (!selectedId) setSelectedId(defaultCells[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
  }, []);

  useEffect(() => {
    if (!window.agency || !window.agency.onCellsUpdated) {
      return undefined;
    }
    const unsubscribe = window.agency.onCellsUpdated(() => loadCells());
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleStateChange = async (nextState) => {
    if (!selectedCell || !window.agency?.updateCellState) {
      return;
    }
    try {
      await window.agency.updateCellState({
        id: selectedCell.id,
        state: nextState,
        worktreePath: selectedCell.worktreePath,
      });
      // Optimistic update
      setCells(cells.map(c => c.id === selectedCell.id ? { ...c, state: nextState } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async ({ name, branch, reusePath }) => {
    if (!window.agency?.createCell) {
      return;
    }
    setLoading(true);
    try {
      const cell = await window.agency.createCell({ name, branch, reusePath });
      setShowCreate(false);
      await loadCells();
      if (cell?.id) {
        setSelectedId(cell.id);
      }
      setTerminalMode('cli');
      setTerminalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      
      {/* Main Workspace Area (Activity Bar + Sidebar + Editor) */}
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar activeView={activeView} onSwitchView={setActiveView} />
        
        {activeView === 'explorer' && (
             <Sidebar 
                cells={cells} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                onCreate={() => setShowCreate(true)}
             />
        )}

        <EditorPane 
            cell={selectedCell}
            terminalMode={terminalMode}
            terminalOpen={terminalOpen}
            onStateChange={handleStateChange}
            onOpenTerminal={() => {
                setTerminalMode('shell');
                setTerminalOpen(true);
            }}
            onStartCLI={() => {
                setTerminalMode('cli');
                setTerminalOpen(true);
            }}
        />
      </div>

      {/* Global Status Bar */}
      <StatusBar loading={loading} onRefresh={loadCells} />

      {/* Modals */}
      {showCreate ? (
        <CreateCellModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      ) : null}
    </div>
  );
}

function CreateCellModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [reuseExisting, setReuseExisting] = useState(false);
  const [worktrees, setWorktrees] = useState([]);
  const [selectedWorktree, setSelectedWorktree] = useState('');
  const [branchPrefix, setBranchPrefix] = useState(branchPrefixes[0]);
  const selectedWorktreeInfo = worktrees.find((item) => item.path === selectedWorktree);
  const generatedBranch = name ? `${branchPrefix}/${toBranchSlug(name)}` : '';
  const needsBranch = reuseExisting && selectedWorktreeInfo && !selectedWorktreeInfo.branch;
  const canSubmit = reuseExisting
    ? Boolean(selectedWorktree) && (selectedWorktreeInfo?.branch || generatedBranch)
    : Boolean(generatedBranch);

  useEffect(() => {
    const loadWorktrees = async () => {
      if (!window.agency?.listWorktrees) {
        return;
      }
      try {
        const items = await window.agency.listWorktrees();
        setWorktrees(items);
      } catch (error) {
        console.error(error);
      }
    };
    loadWorktrees();
  }, []);

  const handleWorktreeSelect = (event) => {
    const nextPath = event.target.value;
    setSelectedWorktree(nextPath);
    const match = worktrees.find((item) => item.path === nextPath);
    if (match) {
      const branchParts = (match.branch || '').split('/');
      if (branchParts.length > 1 && branchPrefixes.includes(branchParts[0])) {
        setBranchPrefix(branchParts[0]);
        setName(branchParts.slice(1).join('/'));
      } else {
        setName(pathBaseName(match.path));
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="create-cell-modal"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Create New Agent</h3>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-input bg-transparent text-primary focus:ring-1 focus:ring-primary"
              checked={reuseExisting}
              onChange={(event) => setReuseExisting(event.target.checked)}
            />
            Link to existing git worktree
          </label>
          
          {reuseExisting ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="reuse-worktree">
                Select Worktree
              </label>
              <select
                id="reuse-worktree"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedWorktree}
                onChange={handleWorktreeSelect}
              >
                <option value="">-- Choose directory --</option>
                {worktrees.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.branch || 'detached'} · {item.path}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="cell-name">
              Agent Name
            </label>
            <input
              id="cell-name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. docs-updater"
              disabled={reuseExisting && selectedWorktreeInfo?.branch}
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block" htmlFor="branch-prefix">
              Branch Strategy
            </label>
            <div className="flex gap-2">
                <select
                id="branch-prefix"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={branchPrefix}
                onChange={(event) => setBranchPrefix(event.target.value)}
                disabled={reuseExisting && Boolean(selectedWorktreeInfo?.branch)}
                >
                {branchPrefixes.map((prefix) => (
                    <option key={prefix} value={prefix}>
                    {prefix}/
                    </option>
                ))}
                </select>
                <div className="flex-1 flex items-center px-3 text-sm text-muted-foreground border border-transparent">
                     {toBranchSlug(name) || '<name>'}
                </div>
            </div>
             <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted/30 p-1.5 rounded">
              git branch: {reuseExisting && selectedWorktreeInfo?.branch
                ? selectedWorktreeInfo.branch
                : (generatedBranch || '...')}
            </p>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
              onClick={() =>
                onCreate({
                  name,
                  branch: generatedBranch,
                  reusePath: reuseExisting ? selectedWorktree : undefined,
                })
              }
            >
              Create Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
