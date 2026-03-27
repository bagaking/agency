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
    <div
      data-commander-drawer="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-[min(500px,calc(100%-72px))] max-w-full justify-end"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 bg-[linear-gradient(90deg,rgba(4,7,11,0)_0%,rgba(4,7,11,0.16)_18%,rgba(4,7,11,0.44)_52%,rgba(4,7,11,0.78)_100%)]" />
      <div
        ref={popupRef}
        className="pointer-events-auto relative flex h-full w-full max-w-[500px] justify-end pl-6"
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
