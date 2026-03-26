import React, { useMemo, useRef } from 'react';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { SessionMapCommanderDialog } from './SessionMapCommanderDialog';

export function SessionMapCommanderPopup({
  open,
  focusData,
  harnessRuns,
  sessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onClearSessionError,
  onClose,
  triggerRef,
}: any) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const dismissRefs = useMemo(
    () => [popupRef, triggerRef].filter(Boolean),
    [triggerRef]
  );

  useDismissibleLayer({
    open: Boolean(open),
    onDismiss: () => onClose?.(),
    refs: dismissRefs as any,
  });

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end px-3 pb-3 pt-10">
      <div
        ref={popupRef}
        className="pointer-events-auto h-full max-h-full w-[min(480px,calc(100%-24px))] max-w-[480px]"
      >
        <SessionMapCommanderDialog
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
