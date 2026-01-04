import React, { useEffect, useState } from 'react';
import {
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
  selectedSheet,
  selectedId,
  onSaveSheet,
  onUpdateChecks,
  onRefreshChecks,
  onDispatchSheet,
  onCancelSheet,
  onViewSession,
  sessions,
  sessionId,
  onSelectSession,
  error,
}) {
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/20 bg-background/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <ClipboardCheck size={16} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-foreground uppercase tracking-tight">Action Sheet Editor</div>
            <div className="text-[10px] text-muted-foreground font-mono opacity-50">
              {activeStatus ? `${activeStatus.id}` : 'No sheet selected'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeStatus && (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300 shrink-0">
          <AlertTriangle size={12} className="inline mr-1" /> {error}
        </div>
      )}

      {!activeStatus ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[11px] text-muted-foreground/40 gap-4">
          <div className="p-4 rounded-full bg-muted/5 border border-border/10">
            <ClipboardCheck size={32} className="opacity-20" />
          </div>
          Select an Action Sheet from the sidebar to start editing.
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status Panel - Full Width */}
          <div className="shrink-0 border-b border-border/10 bg-muted/5 px-8 py-5">
             <ActionSheetStatusPanel
              sheet={activeStatus}
              sessions={sessions}
              sessionId={sessionId}
              onSelectSession={onSelectSession}
              onDispatchSheet={onDispatchSheet}
              onCancelSheet={onCancelSheet}
              onRefreshChecks={onRefreshChecks}
              onViewSession={onViewSession}
            />
          </div>

          {/* 2-Column Editor Layout */}
          <div className="flex-1 h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-background">
            
            {/* Left Column: The Code Editor Experience */}
            <div className="lg:col-span-8 flex flex-col font-mono text-sm relative border-r border-border/10 overflow-hidden bg-muted/[0.03]">
              {/* Line Numbers Gutter */}
              <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-border/20 bg-muted/10 z-0" />

              <div className="flex-1 overflow-y-auto pl-12 z-10 relative">
                
                {/* Section: META (Title) */}
                <div className="group border-b border-border/10 relative hover:bg-background/40 transition-colors">
                  <div className="absolute -left-9 top-6 text-[10px] font-bold text-muted-foreground/20 select-none">01</div>
                  <div className="p-6">
                    <label className="block text-[9px] font-black text-primary/50 mb-2 tracking-[0.2em] uppercase group-focus-within:text-primary transition-colors">
                      // TITLE_PROPERTY
                    </label>
                    <div className="bg-background rounded-lg border border-border/10 p-3 focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="w-full bg-transparent text-xl font-bold text-foreground placeholder:text-muted-foreground/20 focus:outline-none"
                        placeholder="Untitled Sheet"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: PLAN */}
                <div className="group border-b border-border/10 relative hover:bg-background/40 transition-colors">
                   <div className="absolute -left-9 top-6 text-[10px] font-bold text-muted-foreground/20 select-none">02</div>
                   <div className="p-6">
                    <label className="block text-[9px] font-black text-primary/50 mb-2 tracking-[0.2em] uppercase group-focus-within:text-primary transition-colors">
                      // EXECUTION_PLAN
                    </label>
                    <div className="bg-background rounded-lg border border-border/10 p-4 focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                      <textarea
                        value={plan}
                        onChange={(event) => setPlan(event.target.value)}
                        rows={6}
                        className="w-full bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/20 focus:outline-none resize-none font-mono"
                        placeholder="Describe the objective..."
                      />
                    </div>
                  </div>
                </div>

                {/* Split View: REQ & CONTEXT */}
                <div className="grid grid-cols-1 xl:grid-cols-2 border-b border-border/10">
                  <div className="group border-r border-border/10 relative hover:bg-background/40 transition-colors">
                     <div className="absolute -left-9 top-6 text-[10px] font-bold text-muted-foreground/20 select-none">03</div>
                     <div className="p-6">
                      <label className="block text-[9px] font-black text-primary/50 mb-2 tracking-[0.2em] uppercase group-focus-within:text-primary transition-colors">
                        // REQUIREMENTS_SPEC
                      </label>
                      <div className="bg-background rounded-lg border border-border/10 p-4 focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                        <textarea
                          value={requirements}
                          onChange={(event) => setRequirements(event.target.value)}
                          rows={12}
                          className="w-full bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/20 focus:outline-none resize-none font-mono"
                          placeholder="- Constraint 1&#10;- Constraint 2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="group relative hover:bg-background/40 transition-colors">
                     <div className="p-6">
                      <label className="block text-[9px] font-black text-primary/50 mb-2 tracking-[0.2em] uppercase group-focus-within:text-primary transition-colors">
                        // KNOWLEDGE_CONTEXT
                      </label>
                      <div className="bg-background rounded-lg border border-border/10 p-4 focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                        <textarea
                          value={context}
                          onChange={(event) => setContext(event.target.value)}
                          rows={12}
                          className="w-full bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/20 focus:outline-none resize-none font-mono"
                          placeholder="Paste context here..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: DONE */}
                <div className="group border-b border-border/10 relative hover:bg-background/40 transition-colors">
                     <div className="absolute -left-9 top-6 text-[10px] font-bold text-muted-foreground/20 select-none">04</div>
                     <div className="p-6">
                      <label className="block text-[9px] font-black text-primary/50 mb-2 tracking-[0.2em] uppercase group-focus-within:text-primary transition-colors">
                        // SUCCESS_CRITERIA
                      </label>
                      <div className="bg-background rounded-lg border border-border/10 p-4 focus-within:border-primary/30 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                        <textarea
                          value={done}
                          onChange={(event) => setDone(event.target.value)}
                          rows={4}
                          className="w-full bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/20 focus:outline-none resize-none font-mono"
                          placeholder="Success criteria..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-[200px] flex items-center justify-center text-muted-foreground/5 text-4xl font-black select-none pointer-events-none uppercase tracking-widest">
                    END_OF_SHEET
                  </div>
                </div>
              </div>

              {/* Right Column: The Config (Sidebar) */}
              <div className="lg:col-span-4 bg-background flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  
                  {/* Validation Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-foreground border-b border-border/10 pb-2">
                      <Terminal size={14} className="text-primary" />
                      <h3 className="text-[11px] font-bold uppercase tracking-widest">Validation_Suite</h3>
                    </div>
                    
                    <div className="rounded-lg border border-border/10 bg-muted/5 p-1 focus-within:border-primary/30 transition-colors shadow-sm focus-within:bg-background">
                      <textarea
                        value={checksText}
                        onChange={(event) => setChecksText(event.target.value)}
                        rows={6}
                        className="w-full bg-transparent px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none resize-y"
                        placeholder="Label :: command"
                      />
                    </div>

                    <div className="space-y-1.5 px-1">
                      {activeChecks.map((check) => (
                        <div
                          key={check.id}
                          onClick={() => handleToggleCheck(check.id)}
                          className="group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 bg-muted/5 hover:bg-muted/20 transition-all border border-border/5 hover:border-border/10"
                        >
                          <span className="text-[11px] text-muted-foreground group-hover:text-foreground truncate pr-2 font-mono">
                            {check.label}
                          </span>
                          {check.status === 'passed' ? (
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          ) : check.status === 'failed' ? (
                            <XCircle size={12} className="text-rose-500 shrink-0" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px w-full bg-border/10" />

                  {/* Runtime Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-foreground border-b border-border/10 pb-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw size={14} className="text-primary" />
                        <h3 className="text-[11px] font-bold uppercase tracking-widest">Runtime_Engine</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConditionalEnabled((prev) => !prev)}
                        className={`h-4 w-8 rounded-full transition-colors relative ${conditionalEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${conditionalEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    
                    <div className={`space-y-4 transition-all ${conditionalEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/60 block uppercase tracking-wider">MAX_RETRIES</label>
                            <input
                              value={maxAttempts}
                              onChange={(event) => setMaxAttempts(event.target.value)}
                              className="w-full rounded-md border border-border/10 bg-muted/5 px-3 py-2 text-[11px] focus:bg-background focus:border-primary/30 transition-all focus:outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/60 block uppercase tracking-wider">DELAY_SEC</label>
                            <input
                              value={cooldown}
                              onChange={(event) => setCooldown(event.target.value)}
                              className="w-full rounded-md border border-border/10 bg-muted/5 px-3 py-2 text-[11px] focus:bg-background focus:border-primary/30 transition-all focus:outline-none font-mono"
                            />
                          </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-muted-foreground/60 block uppercase tracking-wider">RECOVERY_PROMPT</label>
                        <textarea
                          value={followupPrompt}
                          onChange={(event) => setFollowupPrompt(event.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-border/10 bg-muted/5 px-3 py-2 text-[11px] focus:bg-background focus:border-primary/30 transition-all focus:outline-none resize-none font-mono"
                          placeholder="Guidance..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
