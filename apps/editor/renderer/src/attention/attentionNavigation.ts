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
  };
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

export function describeAttentionNavigation(item: AttentionLike | null | undefined): {
  stateLabel: string;
  actionLabel: string;
} {
  if (!item) {
    return {
      stateLabel: 'Attention',
      actionLabel: 'Open attention',
    };
  }

  const windowStateId = normalizeText(item.refs?.windowStateId);
  if (item.source === 'window' && windowStateId) {
    return {
      stateLabel: 'Attention in another window',
      actionLabel: 'Focus window',
    };
  }

  switch (item.kind) {
    case ATTENTION_KINDS.unread:
      return {
        stateLabel: 'Unread output',
        actionLabel: 'Jump to session',
      };
    case ATTENTION_KINDS.returnRequired:
      return {
        stateLabel: 'Review needed',
        actionLabel: 'Jump to session',
      };
    case ATTENTION_KINDS.pendingConfirmation:
      return {
        stateLabel: 'Confirmation needed',
        actionLabel: 'Open Session Map',
      };
    case ATTENTION_KINDS.failed:
      return {
        stateLabel: 'Failed',
        actionLabel: 'Open Session Map evidence',
      };
    case ATTENTION_KINDS.running:
      return {
        stateLabel: 'Running',
        actionLabel: 'Open Session Map evidence',
      };
    default:
      return {
        stateLabel: 'Attention',
        actionLabel: 'Open attention',
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
