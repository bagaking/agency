import { ATTENTION_KINDS } from '../../../shared/attention';

type AttentionLike = {
  kind?: string;
  label?: string;
  detail?: string;
  source?: 'local' | 'window';
  refs?: {
    windowStateId?: string;
    cellId?: string;
    sessionId?: string;
    runId?: string;
  };
};

export type AttentionNavigationDescriptor = {
  stateLabel: string;
  actionLabel: string;
  target: 'focus-window' | 'jump-session' | 'open-session-map' | 'none';
  mapSelection: 'session' | 'cell' | 'none';
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function summarizeAttentionText(item: AttentionLike | null | undefined): string {
  const detail = normalizeText(item?.detail);
  const label = normalizeText(item?.label);
  const summary = (detail || label).replace(/[.?!]+$/g, '').trim();
  if (!summary) {
    return '';
  }
  if (summary.length <= 88) {
    return summary;
  }
  return `${summary.slice(0, 85).trimEnd()}...`;
}

export function describeAttentionNavigation(
  item: AttentionLike | null | undefined
): AttentionNavigationDescriptor {
  if (!item) {
    return {
      stateLabel: 'Attention',
      actionLabel: 'Open attention',
      target: 'none',
      mapSelection: 'none',
    };
  }

  const windowStateId = normalizeText(item.refs?.windowStateId);
  const cellId = normalizeText(item.refs?.cellId);
  const sessionId = normalizeText(item.refs?.sessionId);
  const runId = normalizeText(item.refs?.runId);
  if (item.source === 'window' && windowStateId) {
    return {
      stateLabel:
        item.kind === ATTENTION_KINDS.failed
          ? 'Failed'
          : item.kind === ATTENTION_KINDS.pendingConfirmation
            ? 'Confirm'
            : item.kind === ATTENTION_KINDS.unread
              ? 'Unread'
              : item.kind === ATTENTION_KINDS.returnRequired
                ? 'Review'
                : item.kind === ATTENTION_KINDS.running
                  ? 'Running'
                  : 'Attention',
      actionLabel: 'Focus window',
      target: 'focus-window',
      mapSelection: 'none',
    };
  }

  switch (item.kind) {
    case ATTENTION_KINDS.unread:
      return {
        stateLabel: 'Unread',
        actionLabel: cellId && sessionId ? 'Jump to session' : 'Open attention',
        target: cellId && sessionId ? 'jump-session' : 'none',
        mapSelection: 'none',
      };
    case ATTENTION_KINDS.returnRequired:
      return {
        stateLabel: 'Review',
        actionLabel: cellId && sessionId ? 'Jump to session' : 'Open attention',
        target: cellId && sessionId ? 'jump-session' : 'none',
        mapSelection: 'none',
      };
    case ATTENTION_KINDS.pendingConfirmation:
      return {
        stateLabel: 'Confirm',
        actionLabel: 'Open Session Map',
        target: 'open-session-map',
        mapSelection: cellId ? 'cell' : 'none',
      };
    case ATTENTION_KINDS.failed:
      return {
        stateLabel: 'Failed',
        actionLabel:
          cellId && sessionId && runId
            ? 'Open evidence in Session Map'
            : 'Open Session Map',
        target: 'open-session-map',
        mapSelection:
          cellId && sessionId
            ? 'session'
            : cellId
              ? 'cell'
              : 'none',
      };
    case ATTENTION_KINDS.running:
      return {
        stateLabel: 'Running',
        actionLabel:
          cellId && sessionId && runId
            ? 'Open evidence in Session Map'
            : 'Open Session Map',
        target: 'open-session-map',
        mapSelection:
          cellId && sessionId
            ? 'session'
            : cellId
              ? 'cell'
              : 'none',
      };
    default:
      return {
        stateLabel: 'Attention',
        actionLabel: 'Open attention',
        target: 'none',
        mapSelection: 'none',
      };
  }
}

export function buildNextAttentionTooltip(item: AttentionLike | null | undefined): string {
  const { stateLabel, actionLabel } = describeAttentionNavigation(item);
  const summary = summarizeAttentionText(item);
  const parts = [`Next: ${stateLabel}.`];
  if (summary) {
    parts.push(`${summary}.`);
  }
  parts.push(`${actionLabel}.`);
  return parts.join(' ');
}
