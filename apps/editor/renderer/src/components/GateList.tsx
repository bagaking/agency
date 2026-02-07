import React from 'react';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

export function GateList({ gates, emptyLabel = 'Gate status unavailable.' }: any) {
  if (!gates || gates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Circle size={14} className="text-muted-foreground/70" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="gate-list">
      {gates.map((gate) => (
        <div key={gate.id} className="flex items-start gap-2 text-xs">
          {gate.passed ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={14} className="text-amber-400" />
          )}
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{gate.label}</span>
            {gate.detail ? (
              <span className="text-muted-foreground" title={gate.detail}>
                {gate.detail}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
