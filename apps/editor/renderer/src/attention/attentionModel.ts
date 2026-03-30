import {
  ATTENTION_KINDS,
  ATTENTION_OWNER_KINDS,
  ATTENTION_SEVERITIES,
  type AttentionKind,
  type AttentionOwnerKind,
  type AttentionRefs,
  type AttentionSeverity,
  type WindowAttentionSummary,
  compareAttentionSeverity,
  normalizeWindowAttentionSummary,
} from '../../../shared/attention';
import { resolveTrackedHarnessTerminalOutcome } from '../utils/commanderHarnessTracking';

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  ownerKind: AttentionOwnerKind;
  severity: Exclude<AttentionSeverity, 'none'>;
  label: string;
  detail: string;
  refs: AttentionRefs;
  source: 'local' | 'window';
  updatedAtMs: number;
  count: number;
};

type AttentionWindowLike = {
  windowStateId?: string;
  projectRoot?: string;
  projectName?: string;
  title?: string;
  isFocused?: boolean;
  attentionSummary?: unknown;
};

type BuildAttentionModelArgs = {
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
  windows?: AttentionWindowLike[];
};

type AttentionCellSummary = {
  count: number;
  strongest: AttentionItem;
};

type AttentionModel = {
  localItems: AttentionItem[];
  windowItems: AttentionItem[];
  allItems: AttentionItem[];
  primaryItem: AttentionItem | null;
  localSummary: WindowAttentionSummary;
  byCellId: Record<string, AttentionCellSummary>;
  bySessionKey: Record<string, AttentionItem>;
};

const KIND_PRIORITY: Record<AttentionKind, number> = {
  [ATTENTION_KINDS.failed]: 0,
  [ATTENTION_KINDS.pendingConfirmation]: 1,
  [ATTENTION_KINDS.returnRequired]: 2,
  [ATTENTION_KINDS.running]: 3,
  [ATTENTION_KINDS.unread]: 4,
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function resolveTimestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortAttentionItems(left: AttentionItem, right: AttentionItem): number {
  const severityCompare = compareAttentionSeverity(left.severity, right.severity);
  if (severityCompare !== 0) {
    return severityCompare;
  }
  const kindCompare = KIND_PRIORITY[left.kind] - KIND_PRIORITY[right.kind];
  if (kindCompare !== 0) {
    return kindCompare;
  }
  return right.updatedAtMs - left.updatedAtMs;
}

function buildItem(input: {
  id: string;
  kind: AttentionKind;
  ownerKind: AttentionOwnerKind;
  severity: Exclude<AttentionSeverity, 'none'>;
  label: string;
  detail: string;
  refs?: AttentionRefs;
  source?: 'local' | 'window';
  updatedAtMs?: number;
  count?: number;
}): AttentionItem {
  return {
    id: normalizeText(input.id),
    kind: input.kind,
    ownerKind: input.ownerKind,
    severity: input.severity,
    label: normalizeText(input.label),
    detail: normalizeText(input.detail),
    refs: input.refs || {},
    source: input.source || 'local',
    updatedAtMs: Number.isFinite(input.updatedAtMs) ? Number(input.updatedAtMs) : 0,
    count: Number.isFinite(input.count) ? Math.max(1, Math.floor(Number(input.count))) : 1,
  };
}

function resolveRunRefs(run: any): AttentionRefs {
  const attentionRefs = run?.attentionRefs || run?.contextRefs || {};
  return {
    cellId: normalizeText(attentionRefs?.cellId),
    sessionId: normalizeText(attentionRefs?.sourceSessionId || attentionRefs?.sessionId),
    runId: normalizeText(run?.runId),
  };
}

function buildFailedRunItem(run: any): AttentionItem | null {
  const status = normalizeText(run?.status).toLowerCase();
  if (status !== 'failed') {
    return null;
  }
  const message =
    normalizeText(run?.failures?.[0]?.message) ||
    normalizeText(run?.currentStep?.title) ||
    'Run failed and needs intervention.';
  return buildItem({
    id: `run-failed:${normalizeText(run?.runId)}`,
    kind: ATTENTION_KINDS.failed,
    ownerKind: ATTENTION_OWNER_KINDS.run,
    severity: ATTENTION_SEVERITIES.critical,
    label: normalizeText(run?.goal?.title) || 'Failed Run',
    detail: message,
    refs: resolveRunRefs(run),
    updatedAtMs: resolveTimestampMs(run?.updatedAt),
  });
}

function buildRunningRunItem(run: any): AttentionItem | null {
  const status = normalizeText(run?.status).toLowerCase();
  if (!['queued', 'running', 'cancelling'].includes(status)) {
    return null;
  }
  return buildItem({
    id: `run-running:${normalizeText(run?.runId)}`,
    kind: ATTENTION_KINDS.running,
    ownerKind: ATTENTION_OWNER_KINDS.run,
    severity: ATTENTION_SEVERITIES.high,
    label: normalizeText(run?.goal?.title) || 'Running Child Execution',
    detail:
      normalizeText(run?.currentStep?.title) ||
      normalizeText(run?.currentStep?.id) ||
      'Run is still active.',
    refs: resolveRunRefs(run),
    updatedAtMs: resolveTimestampMs(run?.updatedAt),
  });
}

function findCellIdForSession(
  createdSessionId: string,
  sessionsByCellId: Record<string, any[]>
): string {
  return (
    Object.entries(sessionsByCellId || {}).find(([, sessions]) =>
      Array.isArray(sessions)
        ? sessions.some((session) => normalizeText(session?.id) === createdSessionId)
        : false
    )?.[0] || ''
  );
}

function buildReturnRequiredItems({
  harnessRuns,
  sessionsByCellId,
  sessionVisitedByKey,
}: {
  harnessRuns: any[];
  sessionsByCellId: Record<string, any[]>;
  sessionVisitedByKey: Record<string, number>;
}): AttentionItem[] {
  return (Array.isArray(harnessRuns) ? harnessRuns : [])
    .map((run) => {
      const outcome = resolveTrackedHarnessTerminalOutcome(run);
      if (!outcome.createdSessionId) {
        return null;
      }
      const runStatus = normalizeText(run?.status).toLowerCase();
      if (!['succeeded', 'failed', 'cancelled'].includes(runStatus)) {
        return null;
      }
      const refs = resolveRunRefs(run);
      const cellId =
        normalizeText(refs.cellId) ||
        findCellIdForSession(outcome.createdSessionId, sessionsByCellId);
      if (!cellId) {
        return null;
      }
      const sessionKey = `${cellId}:${outcome.createdSessionId}`;
      const visitedAt = Number(sessionVisitedByKey?.[sessionKey] || 0);
      const updatedAtMs = resolveTimestampMs(run?.updatedAt);
      if (visitedAt && updatedAtMs && visitedAt >= updatedAtMs) {
        return null;
      }
      return buildItem({
        id: `return-required:${normalizeText(run?.runId)}:${outcome.createdSessionId}`,
        kind: ATTENTION_KINDS.returnRequired,
        ownerKind: ATTENTION_OWNER_KINDS.session,
        severity:
          runStatus === 'failed'
            ? ATTENTION_SEVERITIES.critical
            : ATTENTION_SEVERITIES.high,
        label: outcome.partialSuccess ? 'Child Session Needs Review' : 'Return to Child Session',
        detail:
          normalizeText(outcome.failureMessage) ||
          normalizeText(run?.goal?.title) ||
          'A child session is ready and has not been revisited yet.',
        refs: {
          ...refs,
          cellId,
          sessionId: outcome.createdSessionId,
        },
        updatedAtMs,
      });
    })
    .filter(Boolean) as AttentionItem[];
}

function buildPendingConfirmationItem(
  pendingTransition: any,
  transitionError = ''
): AttentionItem | null {
  const cellId = normalizeText(pendingTransition?.cell?.id);
  if (!cellId) {
    return null;
  }
  const nextState = normalizeText(pendingTransition?.nextState) || 'next state';
  return buildItem({
    id: `pending-confirmation:${cellId}:${nextState}`,
    kind: ATTENTION_KINDS.pendingConfirmation,
    ownerKind: ATTENTION_OWNER_KINDS.cell,
    severity: transitionError
      ? ATTENTION_SEVERITIES.critical
      : ATTENTION_SEVERITIES.high,
    label: `Confirm ${nextState}`,
    detail:
      normalizeText(transitionError) ||
      `Cell ${normalizeText(pendingTransition?.cell?.name) || cellId} is waiting for lifecycle confirmation.`,
    refs: {
      cellId,
    },
    updatedAtMs: Date.now(),
  });
}

function buildSessionErrorItem(
  sessionError: string,
  selectedCell: any,
  activeSessionId = ''
): AttentionItem | null {
  const normalizedError = normalizeText(sessionError);
  if (!normalizedError) {
    return null;
  }
  return buildItem({
    id: `session-error:${normalizeText(selectedCell?.id)}:${normalizeText(activeSessionId)}`,
    kind: ATTENTION_KINDS.failed,
    ownerKind: activeSessionId
      ? ATTENTION_OWNER_KINDS.session
      : ATTENTION_OWNER_KINDS.cell,
    severity: ATTENTION_SEVERITIES.critical,
    label: activeSessionId ? 'Session Action Failed' : 'Cell Action Failed',
    detail: normalizedError,
    refs: {
      cellId: normalizeText(selectedCell?.id),
      sessionId: normalizeText(activeSessionId),
    },
    updatedAtMs: Date.now(),
  });
}

function buildUnreadItems({
  cells,
  sessionsByCellId,
  selectedCell,
  activeSessionId,
  sessionActivityByKey,
  sessionVisitedByKey,
}: {
  cells: any[];
  sessionsByCellId: Record<string, any[]>;
  selectedCell?: any;
  activeSessionId?: string;
  sessionActivityByKey: Record<string, number>;
  sessionVisitedByKey: Record<string, number>;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const visibleCellId = normalizeText(selectedCell?.id);
  const visibleSessionId = normalizeText(activeSessionId);
  (Array.isArray(cells) ? cells : []).forEach((cell) => {
    const cellId = normalizeText(cell?.id);
    if (!cellId) {
      return;
    }
    const sessions = Array.isArray(sessionsByCellId?.[cellId])
      ? sessionsByCellId[cellId]
      : [];
    sessions.forEach((session) => {
      const sessionId = normalizeText(session?.id);
      const sessionStatus = normalizeText(session?.status).toLowerCase();
      if (
        !sessionId ||
        (cellId === visibleCellId && sessionId === visibleSessionId) ||
        ['closed', 'stale', 'archived'].includes(sessionStatus)
      ) {
        return;
      }
      const sessionKey = `${cellId}:${sessionId}`;
      const activityAt =
        Number(sessionActivityByKey?.[sessionKey]) ||
        resolveTimestampMs(session?.lastActivityAt);
      const visitedAt =
        Number(sessionVisitedByKey?.[sessionKey]) ||
        resolveTimestampMs(session?.lastVisitedAt);
      if (!activityAt || activityAt <= visitedAt) {
        return;
      }
      items.push(
        buildItem({
          id: `unread:${sessionKey}:${activityAt}`,
          kind: ATTENTION_KINDS.unread,
          ownerKind: ATTENTION_OWNER_KINDS.session,
          severity: ATTENTION_SEVERITIES.medium,
          label: normalizeText(session?.name) || sessionId,
          detail: `New output since you last visited ${normalizeText(cell?.name) || cellId}.`,
          refs: {
            cellId,
            sessionId,
          },
          updatedAtMs: activityAt,
        })
      );
    });
  });
  return items;
}

function buildWindowItems(windows: AttentionWindowLike[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  (Array.isArray(windows) ? windows : []).forEach((windowEntry) => {
    if (windowEntry?.isFocused) {
      return;
    }
    const summary = normalizeWindowAttentionSummary(windowEntry?.attentionSummary);
    if (!summary?.primary) {
      return;
    }
    items.push(
      buildItem({
        id: `window:${normalizeText(windowEntry?.windowStateId)}:${summary.primary.id}`,
        kind: summary.primary.kind,
        ownerKind: ATTENTION_OWNER_KINDS.window,
        severity: summary.primary.severity,
        label:
          normalizeText(windowEntry?.projectName) ||
          normalizeText(windowEntry?.title) ||
          'Other Window',
        detail:
          normalizeText(summary.primary.label) +
          (summary.primary.detail ? ` · ${summary.primary.detail}` : ''),
        refs: {
          windowStateId: normalizeText(windowEntry?.windowStateId),
          projectRoot: normalizeText(windowEntry?.projectRoot),
        },
        source: 'window',
        updatedAtMs: resolveTimestampMs(summary.updatedAt),
        count: summary.itemCount || 1,
      })
    );
  });
  return items;
}

function buildLocalSummary(items: AttentionItem[]): WindowAttentionSummary {
  const localItems = [...items].sort(sortAttentionItems);
  const countsByKind: Partial<Record<AttentionKind, number>> = {};
  localItems.forEach((item) => {
    countsByKind[item.kind] = Number(countsByKind[item.kind] || 0) + 1;
  });
  const primary = localItems[0] || null;
  return {
    version: 1,
    itemCount: localItems.length,
    highestSeverity: primary?.severity || ATTENTION_SEVERITIES.none,
    countsByKind,
    primary: primary
      ? {
          id: primary.id,
          kind: primary.kind,
          ownerKind: primary.ownerKind,
          severity: primary.severity,
          label: primary.label,
          detail: primary.detail,
          refs: primary.refs,
        }
      : null,
    updatedAt: '',
  };
}

function buildGroupedSummaries(items: AttentionItem[]): {
  byCellId: Record<string, AttentionCellSummary>;
  bySessionKey: Record<string, AttentionItem>;
} {
  const byCellId: Record<string, AttentionCellSummary> = {};
  const bySessionKey: Record<string, AttentionItem> = {};

  [...items].sort(sortAttentionItems).forEach((item) => {
    const cellId = normalizeText(item.refs.cellId);
    const sessionId = normalizeText(item.refs.sessionId);
    if (cellId) {
      const existingCell = byCellId[cellId];
      if (!existingCell) {
        byCellId[cellId] = {
          count: 1,
          strongest: item,
        };
      } else {
        existingCell.count += 1;
      }
    }
    if (cellId && sessionId) {
      const key = `${cellId}:${sessionId}`;
      if (!bySessionKey[key]) {
        bySessionKey[key] = item;
      }
    }
  });

  return {
    byCellId,
    bySessionKey,
  };
}

export function buildAttentionModel({
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
}: BuildAttentionModelArgs): AttentionModel {
  const localItems = [
    ...buildUnreadItems({
      cells,
      sessionsByCellId,
      selectedCell,
      activeSessionId,
      sessionActivityByKey,
      sessionVisitedByKey,
    }),
    ...buildReturnRequiredItems({
      harnessRuns: Array.isArray(harnessRuns) ? harnessRuns : [],
      sessionsByCellId,
      sessionVisitedByKey,
    }),
  ];

  const pendingConfirmation = buildPendingConfirmationItem(
    pendingTransition,
    transitionError
  );
  if (pendingConfirmation) {
    localItems.push(pendingConfirmation);
  }

  const failedRun = (Array.isArray(harnessRuns) ? harnessRuns : [])
    .map((run) => buildFailedRunItem(run))
    .filter(Boolean) as AttentionItem[];
  const runningRun = (Array.isArray(harnessRuns) ? harnessRuns : [])
    .map((run) => buildRunningRunItem(run))
    .filter(Boolean) as AttentionItem[];
  const sessionErrorItem = buildSessionErrorItem(
    sessionError,
    selectedCell,
    activeSessionId
  );
  if (
    sessionErrorItem &&
    !failedRun.some((item) => normalizeText(item.detail) === normalizeText(sessionErrorItem.detail))
  ) {
    localItems.push(sessionErrorItem);
  }
  localItems.push(...failedRun, ...runningRun);

  const sortedLocalItems = [...localItems].sort(sortAttentionItems);
  const windowItems = buildWindowItems(windows).sort(sortAttentionItems);
  const allItems = [...sortedLocalItems, ...windowItems].sort(sortAttentionItems);
  const grouped = buildGroupedSummaries(sortedLocalItems);

  return {
    localItems: sortedLocalItems,
    windowItems,
    allItems,
    primaryItem: allItems[0] || null,
    localSummary: buildLocalSummary(sortedLocalItems),
    byCellId: grouped.byCellId,
    bySessionKey: grouped.bySessionKey,
  };
}
