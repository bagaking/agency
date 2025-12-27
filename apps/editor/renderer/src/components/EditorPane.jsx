import React from 'react';
import { TerminalSquare, AlertTriangle, MonitorPlay, ChevronRight, CheckCircle2, Circle, Play } from 'lucide-react';
import TerminalPane from './TerminalPane.jsx';
import { RiveAnimation } from './RiveAnimation.jsx';
import { GateList } from './GateList.jsx';

export function EditorPane({
  cell,
  terminalMode,
  terminalOpen,
  sessionId,
  onStateChange,
  onOpenTerminal,
  onRunCommand,
  pendingCommand,
  onCommandSent,
}) {
  if (!cell) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="h-32 w-32 mb-4 opacity-50">
             <RiveAnimation 
                src="/assets/animations/empty-state.riv"
                animations="Timeline 1"
                className="w-full h-full"
                fallback={<MonitorPlay size={64} className="w-full h-full p-4 opacity-20" />}
             />
        </div>
        <p>Select an agent to view details</p>
      </div>
    );
  }

  return (
    <main className="flex h-full flex-1 flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-primary font-bold">AGENCY</span>
                <ChevronRight size={14} className="text-muted-foreground" />
                <span className="font-medium">{cell.name}</span>
                <span className="mx-2 text-muted-foreground/30">|</span>
                <span className="font-mono text-xs text-muted-foreground" title={cell.worktreePath}>{cell.branch}</span>
            </div>
            <div className="flex items-center gap-2">
                 {cell.validation?.warnings?.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-500" title={cell.validation.warnings.join('\n')}>
                        <AlertTriangle size={12} />
                        <span>Validation Warning</span>
                    </div>
                )}
            </div>
        </header>

        {/* Lifecycle Stepper (Compact) */}
        <div className="shrink-0 border-b border-border bg-card/30 px-6 py-3">
             <div className="flex items-center justify-center gap-4">
                {['draft', 'active', 'archived'].map((step, index, arr) => {
                    const isActive = cell.state === step || (step === 'active' && cell.state === 'paused');
                    const isPast = arr.indexOf(cell.state) > index || (cell.state === 'paused' && step === 'active');
                    // Simple logic: draft < active/paused < archived
                    // If current is 'paused', it counts as 'active' step for visual (or we add paused)
                    // Let's keep it simple: Draft -> Active -> Archived
                    
                    let stateColor = 'text-muted-foreground';
                    let icon = <Circle size={16} />;
                    
                    if (cell.state === step) {
                        stateColor = step === 'active' ? 'text-emerald-400' : step === 'paused' ? 'text-amber-400' : 'text-primary';
                        icon = <CheckCircle2 size={16} className={stateColor} />;
                    } else if (isPast) { // crude approximation
                        stateColor = 'text-primary/60';
                         icon = <CheckCircle2 size={16} className={stateColor} />;
                    }

                    return (
                        <div key={step} className="flex items-center gap-2 cursor-pointer" onClick={() => onStateChange(step)}>
                            <div className={`flex items-center gap-2 ${cell.state === step ? 'font-bold ' + stateColor : 'text-muted-foreground'}`}>
                                {icon}
                                <span className="capitalize text-xs">{step === 'active' && cell.state === 'paused' ? 'Paused' : step}</span>
                            </div>
                            {index < arr.length - 1 && (
                                <div className="h-px w-12 bg-border" />
                            )}
                        </div>
                    );
                })}
             </div>
        </div>

        {/* Lifecycle Gates */}
        <div className="shrink-0 border-b border-border bg-card/20 px-6 py-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lifecycle Gates
                </h3>
                <span className="text-[10px] uppercase text-muted-foreground">v0.2 temporary</span>
            </div>
            <div className="mt-3">
                <GateList gates={cell.gates} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Active/Archived transitions require all gates to pass.
            </p>
        </div>

        {/* Main Content: Terminal */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
             <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <TerminalSquare size={14} />
                    Terminal Session
                </h2>
                <div className="flex gap-2">
                     <button 
                        onClick={onOpenTerminal}
                        className="text-xs flex items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20 transition-colors"
                    >
                        <Play size={10} />
                        Open Shell
                     </button>
                     <div className="hidden items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground md:flex">
                        Quick
                     </div>
                     <div className="flex items-center gap-1">
                        {['codex', 'gemini', 'claude'].map((command) => (
                          <button
                            key={command}
                            type="button"
                            onClick={() => onRunCommand?.(command)}
                            className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                          >
                            {command}
                          </button>
                        ))}
                     </div>
                </div>
             </div>
             <div className="flex-1 rounded-lg border border-border bg-black/95 overflow-hidden shadow-inner relative">
                {terminalOpen ? (
                    <TerminalPane
                      key={cell.id}
                      cell={cell}
                      sessionId={sessionId}
                      mode={terminalMode}
                      pendingCommand={pendingCommand}
                      onCommandSent={onCommandSent}
                    />
                ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <p className="text-sm">Terminal Idle</p>
                        <button onClick={onOpenTerminal} className="mt-2 text-xs underline hover:text-primary">Connect</button>
                    </div>
                )}
             </div>
        </div>
    </main>
  );
}
