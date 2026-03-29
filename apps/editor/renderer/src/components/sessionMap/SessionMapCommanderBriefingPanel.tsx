import React from 'react';
import { SessionMapCommanderBriefing } from './SessionMapCommanderBriefing';

export function SessionMapCommanderBriefingPanel({
  open,
  focusData,
  harnessRuns,
  sessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onClearSessionError,
  onClose,
}: any) {
  if (!open) {
    return null;
  }

  return (
    <div
      data-commander-briefing="true"
      className="flex h-full min-h-0 w-full min-w-0"
    >
      <div className="flex h-full min-h-0 w-full min-w-0">
        <SessionMapCommanderBriefing
          focusData={focusData}
          harnessRuns={harnessRuns}
          sessionError={sessionError}
          onCancelHarnessRun={onCancelHarnessRun}
          onResumeHarnessRun={onResumeHarnessRun}
          onClearSessionError={onClearSessionError}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
