import { useCallback, useEffect, useMemo, useRef } from 'react';

import { ATTENTION_KINDS } from '../../../shared/attention';
import { setUiState } from '../services/agencyBridge';
import {
  buildAttentionModel,
  type AttentionItem,
} from './attentionModel';

type UseAttentionStateArgs = {
  projectRoot?: string;
  selectedCell?: any;
  activeSessionId?: string;
  cells?: any[];
  sessionsByCellId?: Record<string, any[]>;
  activeSessionByCellId?: Record<string, string>;
  sessionActivityByKey?: Record<string, number>;
  sessionVisitedByKey?: Record<string, number>;
  harnessRuns?: any[];
  sessionError?: string;
  pendingTransition?: any;
  transitionError?: string;
  windows?: any[];
  setActiveView?: (value: string) => void;
  setSelectedId?: (value: string | null) => void;
  openSessionMap?: () => void;
  focusWindow?: (windowStateId: string) => Promise<void> | void;
  focusSessionInUi?: (cellId: string, sessionId: string) => void;
  selectSessionFromMap?: (
    cellId: string,
    sessionId: string,
    options?: { focusView?: boolean }
  ) => void;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function buildSummaryPersistenceKey(model: ReturnType<typeof buildAttentionModel>): string {
  const primary = model.localSummary.primary;
  return JSON.stringify({
    itemCount: model.localSummary.itemCount,
    highestSeverity: model.localSummary.highestSeverity,
    primary: primary
      ? {
          id: primary.id,
          kind: primary.kind,
          severity: primary.severity,
          ownerKind: primary.ownerKind,
          label: primary.label,
          detail: primary.detail,
          refs: primary.refs,
        }
      : null,
    countsByKind: model.localSummary.countsByKind,
  });
}

export function useAttentionState({
  projectRoot = '',
  selectedCell = null,
  activeSessionId = '',
  cells = [],
  sessionsByCellId = {},
  activeSessionByCellId = {},
  sessionActivityByKey = {},
  sessionVisitedByKey = {},
  harnessRuns = [],
  sessionError = '',
  pendingTransition = null,
  transitionError = '',
  windows = [],
  setActiveView,
  setSelectedId,
  openSessionMap,
  focusWindow,
  focusSessionInUi,
  selectSessionFromMap,
}: UseAttentionStateArgs) {
  const model = useMemo(
    () =>
      buildAttentionModel({
        projectRoot,
        selectedCell,
        activeSessionId,
        cells,
        sessionsByCellId,
        activeSessionByCellId,
        sessionActivityByKey,
        sessionVisitedByKey,
        harnessRuns,
        sessionError,
        pendingTransition,
        transitionError,
        windows,
      }),
    [
      projectRoot,
      selectedCell,
      activeSessionId,
      cells,
      sessionsByCellId,
      activeSessionByCellId,
      sessionActivityByKey,
      sessionVisitedByKey,
      harnessRuns,
      sessionError,
      pendingTransition,
      transitionError,
      windows,
    ]
  );

  const summaryKey = useMemo(() => buildSummaryPersistenceKey(model), [model]);
  const lastSummaryKeyRef = useRef('');

  useEffect(() => {
    if (summaryKey === lastSummaryKeyRef.current) {
      return;
    }
    lastSummaryKeyRef.current = summaryKey;
    void setUiState({
      attentionSummary: {
        ...model.localSummary,
        updatedAt: new Date().toISOString(),
      },
    }).catch(() => undefined);
  }, [model.localSummary, summaryKey]);

  const jumpToAttention = useCallback(
    (item: AttentionItem | null | undefined) => {
      if (!item) {
        return;
      }
      const windowStateId = normalizeText(item.refs.windowStateId);
      if (item.source === 'window' && windowStateId) {
        void focusWindow?.(windowStateId);
        return;
      }

      const cellId = normalizeText(item.refs.cellId);
      const sessionId = normalizeText(item.refs.sessionId);

      if (item.kind === ATTENTION_KINDS.unread || item.kind === ATTENTION_KINDS.returnRequired) {
        if (cellId && sessionId) {
          setActiveView?.('agent-cells');
          focusSessionInUi?.(cellId, sessionId);
        }
        return;
      }

      if (item.kind === ATTENTION_KINDS.pendingConfirmation) {
        if (cellId) {
          setSelectedId?.(cellId);
        }
        openSessionMap?.();
        return;
      }

      if (item.kind === ATTENTION_KINDS.failed || item.kind === ATTENTION_KINDS.running) {
        if (cellId && sessionId) {
          selectSessionFromMap?.(cellId, sessionId, { focusView: false });
        } else if (cellId) {
          setSelectedId?.(cellId);
        }
        openSessionMap?.();
      }
    },
    [
      focusSessionInUi,
      focusWindow,
      openSessionMap,
      selectSessionFromMap,
      setActiveView,
      setSelectedId,
    ]
  );

  return {
    ...model,
    jumpToAttention,
  };
}
