import React from 'react';

import { DeferredMount } from '../ui/DeferredMount';
import { SessionMapCommanderBriefingPanel } from './SessionMapCommanderBriefingPanel';
import { SessionMapOperationsRail } from './SessionMapOperationsRail';

export function SessionMapRightStation({
  focusData,
  attentionItems,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onSelectAttention,
  commanderBriefingOpen = false,
  onOpenCommanderBriefing,
  onCloseCommanderBriefing,
  commanderTriggerRef,
}: any) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
      <DeferredMount active={true} strategy="retain">
        <div
          hidden={commanderBriefingOpen}
          className={`absolute inset-0 transition-opacity duration-150 ${
            commanderBriefingOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-hidden={commanderBriefingOpen}
        >
          <SessionMapOperationsRail
            focusData={focusData}
            attentionItems={attentionItems}
            harnessRuns={harnessRuns}
            sessionError={sessionError}
            onClearSessionError={onClearSessionError}
            onCancelHarnessRun={onCancelHarnessRun}
            onResumeHarnessRun={onResumeHarnessRun}
            onSelectAttention={onSelectAttention}
            onOpenCommanderBriefing={onOpenCommanderBriefing}
            commanderTriggerRef={commanderTriggerRef}
          />
        </div>
      </DeferredMount>

      <DeferredMount active={commanderBriefingOpen} strategy="retain">
        <div
          hidden={!commanderBriefingOpen}
          className={`absolute inset-0 transition-opacity duration-150 ${
            commanderBriefingOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={!commanderBriefingOpen}
        >
          <SessionMapCommanderBriefingPanel
            open={true}
            active={commanderBriefingOpen}
            focusData={focusData}
            harnessRuns={harnessRuns}
            sessionError={sessionError}
            onCancelHarnessRun={onCancelHarnessRun}
            onResumeHarnessRun={onResumeHarnessRun}
            onClearSessionError={onClearSessionError}
            onClose={() => {
              if (onCloseCommanderBriefing) {
                onCloseCommanderBriefing();
                return;
              }
              onOpenCommanderBriefing?.();
            }}
          />
        </div>
      </DeferredMount>
    </div>
  );
}
