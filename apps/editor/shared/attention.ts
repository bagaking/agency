export const ATTENTION_KINDS = {
  running: 'running',
  failed: 'failed',
  pendingConfirmation: 'pending_confirmation',
  unread: 'unread',
  returnRequired: 'return_required',
} as const;

export type AttentionKind =
  (typeof ATTENTION_KINDS)[keyof typeof ATTENTION_KINDS];

export const ATTENTION_OWNER_KINDS = {
  window: 'window',
  cell: 'cell',
  session: 'session',
  run: 'run',
} as const;

export type AttentionOwnerKind =
  (typeof ATTENTION_OWNER_KINDS)[keyof typeof ATTENTION_OWNER_KINDS];

export const ATTENTION_SEVERITIES = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'none',
} as const;

export type AttentionSeverity =
  (typeof ATTENTION_SEVERITIES)[keyof typeof ATTENTION_SEVERITIES];

export type AttentionRefs = {
  windowStateId?: string;
  projectRoot?: string;
  cellId?: string;
  sessionId?: string;
  runId?: string;
};

export type WindowAttentionPrimary = {
  id: string;
  kind: AttentionKind;
  ownerKind: AttentionOwnerKind;
  severity: Exclude<AttentionSeverity, 'none'>;
  label: string;
  detail: string;
  refs: AttentionRefs;
};

export type WindowAttentionSummary = {
  version: 1;
  itemCount: number;
  highestSeverity: AttentionSeverity;
  countsByKind: Partial<Record<AttentionKind, number>>;
  primary: WindowAttentionPrimary | null;
  updatedAt: string;
};

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeRefs(value: unknown): AttentionRefs {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    windowStateId: normalizeText(raw.windowStateId),
    projectRoot: normalizeText(raw.projectRoot),
    cellId: normalizeText(raw.cellId),
    sessionId: normalizeText(raw.sessionId),
    runId: normalizeText(raw.runId),
  };
}

function isAttentionKind(value: unknown): value is AttentionKind {
  return Object.values(ATTENTION_KINDS).includes(value as AttentionKind);
}

function isAttentionOwnerKind(value: unknown): value is AttentionOwnerKind {
  return Object.values(ATTENTION_OWNER_KINDS).includes(value as AttentionOwnerKind);
}

function isAttentionSeverity(value: unknown): value is AttentionSeverity {
  return Object.values(ATTENTION_SEVERITIES).includes(value as AttentionSeverity);
}

export function attentionSeverityRank(value: unknown): number {
  const normalized = isAttentionSeverity(value) ? value : ATTENTION_SEVERITIES.none;
  return SEVERITY_RANK[normalized];
}

export function compareAttentionSeverity(
  left: AttentionSeverity,
  right: AttentionSeverity
): number {
  return attentionSeverityRank(right) - attentionSeverityRank(left);
}

export function normalizeWindowAttentionSummary(
  value: unknown
): WindowAttentionSummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const primaryRaw =
    raw.primary && typeof raw.primary === 'object'
      ? (raw.primary as Record<string, unknown>)
      : null;
  const primary =
    primaryRaw &&
    isAttentionKind(primaryRaw.kind) &&
    isAttentionOwnerKind(primaryRaw.ownerKind) &&
    isAttentionSeverity(primaryRaw.severity) &&
    primaryRaw.severity !== ATTENTION_SEVERITIES.none
      ? {
          id: normalizeText(primaryRaw.id),
          kind: primaryRaw.kind,
          ownerKind: primaryRaw.ownerKind,
          severity: primaryRaw.severity,
          label: normalizeText(primaryRaw.label),
          detail: normalizeText(primaryRaw.detail),
          refs: normalizeRefs(primaryRaw.refs),
        }
      : null;

  const countsByKind: Partial<Record<AttentionKind, number>> = {};
  if (raw.countsByKind && typeof raw.countsByKind === 'object') {
    Object.entries(raw.countsByKind as Record<string, unknown>).forEach(
      ([key, count]) => {
        if (!isAttentionKind(key)) {
          return;
        }
        const nextCount = Number(count);
        if (!Number.isFinite(nextCount) || nextCount <= 0) {
          return;
        }
        countsByKind[key] = Math.floor(nextCount);
      }
    );
  }

  const highestSeverity = isAttentionSeverity(raw.highestSeverity)
    ? raw.highestSeverity
    : primary?.severity || ATTENTION_SEVERITIES.none;

  return {
    version: 1,
    itemCount: Math.max(0, Math.floor(Number(raw.itemCount) || 0)),
    highestSeverity,
    countsByKind,
    primary,
    updatedAt: normalizeText(raw.updatedAt),
  };
}
