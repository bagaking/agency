import React, { useEffect, useMemo, useState } from 'react';
import 'xterm/css/xterm.css';
import TerminalPane from './components/TerminalPane.jsx';

const defaultCells = [
  {
    id: 'sample-cell',
    name: 'sample-cell',
    branch: 'feature/sample-cell',
    worktreePath: '/path/to/worktree',
    state: 'draft',
    validation: { warnings: ['Spec file not found (temporary validation).'] },
  },
];

const statusStyles = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/20 text-emerald-200',
  paused: 'bg-amber-500/20 text-amber-200',
  archived: 'bg-slate-500/20 text-slate-200',
};
const lifecycleStates = ['draft', 'active', 'paused', 'archived'];
const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;

function App() {
  const [cells, setCells] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');
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
        setSelectedId(defaultCells[0].id);
      }
    } catch (error) {
      console.error(error);
      setCells(defaultCells);
      setSelectedId(defaultCells[0].id);
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
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async ({ name, branch }) => {
    if (!window.agency?.createCell) {
      return;
    }
    setLoading(true);
    try {
      const cell = await window.agency.createCell({ name, branch });
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Agency Editor</h1>
          <p className="text-sm text-muted-foreground">
            Manage Cells, terminals, and agent workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm"
            onClick={loadCells}
            data-testid="refresh-cells"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => setShowCreate(true)}
            data-testid="open-create-cell"
          >
            Create Cell
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-72px)] overflow-hidden">
        <aside className="w-80 shrink-0 border-r border-border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cells
          </h2>
          <div className="mt-4 flex flex-col gap-3" data-testid="cell-list">
            {cells.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No cells yet. Create your first cell to begin.
              </div>
            ) : (
              cells.map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  className={`rounded-lg border border-border p-3 text-left transition hover:border-primary/60 ${
                    selectedId === cell.id ? 'bg-card' : 'bg-transparent'
                  }`}
                  onClick={() => setSelectedId(cell.id)}
                  data-testid={`cell-item-${cell.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{cell.name}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        statusStyles[cell.state] || statusStyles.draft
                      }`}
                    >
                      {cell.state}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {cell.branch}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto p-6">
          {!selectedCell ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">
              Select a cell to view details.
            </div>
          ) : (
            <div className="space-y-6" data-testid="cell-details">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCell.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedCell.worktreePath}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    onClick={() => {
                      setTerminalMode('shell');
                      setTerminalOpen(true);
                    }}
                  >
                    Open Terminal
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => {
                      setTerminalMode('cli');
                      setTerminalOpen(true);
                    }}
                  >
                    Start CLI
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold">Lifecycle</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Status
                  </p>
                  <select
                    className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    value={selectedCell.state}
                    onChange={(event) => handleStateChange(event.target.value)}
                    data-testid="cell-state"
                  >
                    {lifecycleStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold">Validation (MVP)</h3>
                  {selectedCell.validation?.warnings?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
                      {selectedCell.validation.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No warnings.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Terminal</h3>
                <div className="mt-3 h-64 rounded-lg border border-border bg-black/40 p-2 text-xs text-muted-foreground">
                  {terminalOpen ? (
                    <TerminalPane key={selectedCell.id} cell={selectedCell} mode={terminalMode} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Open a terminal session to begin.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {showCreate ? (
        <CreateCellModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      ) : null}
    </div>
  );
}

function CreateCellModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [reuseExisting, setReuseExisting] = useState(false);
  const [worktrees, setWorktrees] = useState([]);
  const [selectedWorktree, setSelectedWorktree] = useState('');
  const canSubmit = reuseExisting ? Boolean(selectedWorktree) : Boolean(name && branch);

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
      setName(pathBaseName(match.path));
      setBranch(match.branch || '');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="create-cell-modal"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create a new Cell</h3>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground">
            Close
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={reuseExisting}
              onChange={(event) => setReuseExisting(event.target.checked)}
            />
            Reuse existing worktree
          </label>
          {reuseExisting ? (
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="reuse-worktree">
                Worktree
              </label>
              <select
                id="reuse-worktree"
                className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                value={selectedWorktree}
                onChange={handleWorktreeSelect}
              >
                <option value="">Select a worktree</option>
                {worktrees.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.branch || 'detached'} · {item.path}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="cell-name">
              Cell name
            </label>
            <input
              id="cell-name"
              className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="agent-editor"
              disabled={reuseExisting}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="cell-branch">
              Branch
            </label>
            <input
              id="cell-branch"
              className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="feature/agency-editor"
              disabled={reuseExisting}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={!canSubmit}
              onClick={() =>
                onCreate({
                  name,
                  branch,
                  reusePath: reuseExisting ? selectedWorktree : undefined,
                })
              }
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
