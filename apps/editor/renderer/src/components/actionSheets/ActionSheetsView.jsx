import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Terminal,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { ProjectEmptyState } from '../ProjectEmptyState.jsx';
import { ActionSheetStatusPanel } from './ActionSheetStatusPanel.jsx';
import { stateBadge, formatTime } from './actionSheetUi.js';

const normalizeChecksText = (checks) =>
  (checks || [])
    .map((check) => (check.commands?.length ? `${check.label} :: ${check.commands.join(' && ')}` : check.label))
    .join('\n');

const parseChecksText = (text) => {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const [label, command] = line.split('::').map((entry) => entry.trim());
    return {
      label,
      commands: command ? [command] : [],
    };
  });
};

export function ActionSheetsView({
  projectReady,
  projectError,
  onSelectProject,
  sheets,
  selectedSheet,
  selectedId,
  onSelectSheet,
  onCreateSheet,
  onSaveSheet,
  onUpdateChecks,
  onRefreshList,
  onRefreshChecks,
  onRunSheet,
  onCancelSheet,
  onViewSession,
  sessions,
  sessionId,
  onSelectSession,
  loading,
  detailLoading,
  error,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [plan, setPlan] = useState('');
  const [requirements, setRequirements] = useState('');
  const [context, setContext] = useState('');
  const [checksText, setChecksText] = useState('');
  const [done, setDone] = useState('');
  const [conditionalEnabled, setConditionalEnabled] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [cooldown, setCooldown] = useState('60');
  const [followupPrompt, setFollowupPrompt] = useState('');

  useEffect(() => {
    if (!selectedSheet) {
      setTitle('');
      setPlan('');
      setRequirements('');
      setContext('');
      setChecksText('');
      setDone('');
      setConditionalEnabled(true);
      setMaxAttempts('3');
      setCooldown('60');
      setFollowupPrompt('');
      return;
    }
    setTitle(selectedSheet.status?.title || '');
    setPlan(selectedSheet.plan || '');
    setRequirements(selectedSheet.prompt?.requirements || '');
    setContext(selectedSheet.prompt?.context || '');
    setChecksText(normalizeChecksText(selectedSheet.checks));
    setDone(selectedSheet.prompt?.done || '');
    const conditional = selectedSheet.status?.conditional || {};
    setConditionalEnabled(conditional.enabled !== false);
    setMaxAttempts(String(conditional.repeat?.maxAttempts ?? 3));
    setCooldown(String(Math.round((conditional.repeat?.cooldownMs ?? 60000) / 1000)));
    setFollowupPrompt(conditional.followupPrompt || '');
  }, [selectedSheet?.id]);

  const activeStatus = selectedSheet?.status || null;
  const activeChecks = selectedSheet?.checks || [];

  const hasRunning = sheets.some((sheet) => sheet.state === 'running' || sheet.state === 'waiting_gate');

  const cycleStatus = (status) => {
    if (status === 'passed') return 'failed';
    if (status === 'failed') return 'pending';
    return 'passed';
  };

  const handleToggleCheck = (checkId) => {
    if (!selectedId || !activeChecks.length) {
      return;
    }
    const nextChecks = activeChecks.map((check) =>
      check.id === checkId
        ? {
            ...check,
            status: cycleStatus(check.status),
            checkedAt: new Date().toISOString(),
          }
        : check
    );
    onUpdateChecks?.(selectedId, nextChecks);
  };

  const handleSave = () => {
    if (!selectedId) return;
    const conditional = {
      enabled: conditionalEnabled,
      when: 'checks.all_passed',
      repeat: {
        maxAttempts: Number(maxAttempts) || 0,
        cooldownMs: (Number(cooldown) || 0) * 1000,
      },
      followupPrompt,
    };
    onSaveSheet?.(selectedId, {
      title,
      plan,
      prompt: {
        requirements,
        context,
        checks: checksText,
        done,
      },
      checks: parseChecksText(checksText),
      conditional,
    });
  };

  if (!projectReady) {
    return (
      <ProjectEmptyState
        title="No project selected"
        description="Select a workspace to manage Action Sheets."
        error={projectError}
        onSelect={onSelectProject}
      />
    );
  }

  return (
    <section className="flex h-full flex-1 bg-background overflow-hidden">
      <aside className="w-72 shrink-0 border-r border-border/20 bg-muted/5 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Action Sheets
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              {sheets.length} total
            </div>
          </div>
          <button
            type="button"
            onClick={onCreateSheet}
            className="rounded-md border border-border/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-border/10">
          <button
            type="button"
            onClick={onRefreshList}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {hasRunning ? (
            <div className="text-[9px] uppercase tracking-[0.2em] text-amber-200/70">
              Running
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          {sheets.length ? (
            sheets.map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                onClick={() => onSelectSheet(sheet.id)}
                className={`w-full px-4 py-3 text-left border-b border-border/10 transition-all ${
                  selectedId === sheet.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold truncate">{sheet.title || sheet.id}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${stateBadge(sheet.state)}`}>
                    {sheet.state || 'queued'}
                  </span>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground/50 flex items-center gap-2">
                  <span>{sheet.sessionId ? `Session ${sheet.sessionId}` : 'No session'}</span>
                  <span>·</span>
                  <span>{formatTime(sheet.updatedAt)}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-[10px] text-muted-foreground/40">
              No Action Sheets yet.
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={16} className="text-primary/70" />
            <div>
              <div className="text-[12px] font-semibold text-foreground">Action Sheet</div>
              <div className="text-[10px] text-muted-foreground/50">
                {activeStatus ? `${activeStatus.id} · ${activeStatus.state}` : 'Select a sheet to edit.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mx-6 mt-4 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
            <AlertTriangle size={12} className="inline mr-1" /> {error}
          </div>
        ) : null}

        {collapsed ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground/40">
            Details collapsed. Select a sheet to resume editing.
          </div>
        ) : activeStatus ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <ActionSheetStatusPanel
              sheet={activeStatus}
              sessions={sessions}
              sessionId={sessionId}
              onSelectSession={onSelectSession}
              onRunSheet={onRunSheet}
              onCancelSheet={onCancelSheet}
              onRefreshChecks={onRefreshChecks}
              onViewSession={onViewSession}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Title
                </div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-md border border-border/20 bg-background px-3 py-1.5 text-[11px] text-foreground"
                />
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">
                  Plan
                </div>
                <textarea
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-border/20 bg-background px-3 py-2 text-[11px] text-foreground"
                />
              </div>
              <div className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Requirements
                </div>
                <textarea
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-border/20 bg-background px-3 py-2 text-[11px] text-foreground"
                />
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mt-2">
                  Context
                </div>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-border/20 bg-background px-3 py-2 text-[11px] text-foreground"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Checks
                </div>
                <div className="text-[10px] text-muted-foreground/40">label :: command</div>
              </div>
              <textarea
                value={checksText}
                onChange={(event) => setChecksText(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-border/20 bg-background px-3 py-2 text-[11px] text-foreground"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeChecks.map((check) => (
                  <button
                    key={check.id}
                    type="button"
                    onClick={() => handleToggleCheck(check.id)}
                    className="flex w-full items-center justify-between rounded-md border border-border/10 bg-background/50 px-3 py-2 text-[11px] transition-all hover:border-primary/30"
                  >
                    <div className="text-left">
                      <div className="text-foreground/80">{check.label}</div>
                      <div className="text-[9px] text-muted-foreground/40">{check.status}</div>
                    </div>
                    {check.status === 'passed' ? (
                      <CheckCircle2 size={14} className="text-emerald-300" />
                    ) : check.status === 'failed' ? (
                      <XCircle size={14} className="text-rose-300" />
                    ) : (
                      <Terminal size={14} className="text-muted-foreground/40" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Done
              </div>
              <textarea
                value={done}
                onChange={(event) => setDone(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-border/20 bg-background px-3 py-2 text-[11px] text-foreground"
              />
            </div>

            <div className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Conditional Plugin
                </div>
                <button
                  type="button"
                  onClick={() => setConditionalEnabled((prev) => !prev)}
                  className="text-[10px] text-muted-foreground/60 hover:text-foreground"
                >
                  {conditionalEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">Max Attempts</div>
                  <input
                    value={maxAttempts}
                    onChange={(event) => setMaxAttempts(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border/20 bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">Cooldown (s)</div>
                  <input
                    value={cooldown}
                    onChange={(event) => setCooldown(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border/20 bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">Follow-up</div>
                  <input
                    value={followupPrompt}
                    onChange={(event) => setFollowupPrompt(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border/20 bg-background px-2 py-1 text-[11px] text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Save Action Sheet
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground/40">
            Select an Action Sheet to edit.
          </div>
        )}
      </div>
    </section>
  );
}
