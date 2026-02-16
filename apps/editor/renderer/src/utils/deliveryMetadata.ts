export const DELIVERY_SOURCES = ['promote', 'explorer'] as const;
export const DELIVERY_MODES = ['quick', 'gated'] as const;

export type DeliverySource = (typeof DELIVERY_SOURCES)[number];
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

type DeliveryTimelineEntryInput = {
  source?: DeliverySource | string;
  mode?: DeliveryMode | string;
  status?: string;
  at?: string;
  label?: string;
  details?: string;
  sessionId?: string;
  actionSheetId?: string;
};

const toIsoTimestamp = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) {
    return new Date().toISOString();
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
};

export const normalizeDeliverySource = (
  value: unknown,
  fallback: DeliverySource = 'promote'
): DeliverySource => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'explorer' ? 'explorer' : fallback;
};

export const normalizeDeliveryMode = (
  value: unknown,
  fallback: DeliveryMode = 'quick'
): DeliveryMode => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'gated' ? 'gated' : fallback;
};

export const buildDeliveryTimelineEntry = ({
  source,
  mode,
  status,
  at,
  label,
  details,
  sessionId,
  actionSheetId,
}: DeliveryTimelineEntryInput = {}) => {
  const normalizedSource = normalizeDeliverySource(source);
  const normalizedMode = normalizeDeliveryMode(mode);
  const normalizedAt = toIsoTimestamp(at);
  return {
    id: `${normalizedAt}:${status || 'unknown'}:${normalizedMode}`,
    at: normalizedAt,
    source: normalizedSource,
    mode: normalizedMode,
    status: String(status || 'queued').trim() || 'queued',
    label: String(label || '').trim() || String(status || 'queued').trim() || 'queued',
    details: String(details || '').trim(),
    sessionId: String(sessionId || '').trim(),
    actionSheetId: String(actionSheetId || '').trim(),
  };
};

const normalizeTimeline = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) =>
      buildDeliveryTimelineEntry({
        source: entry?.source,
        mode: entry?.mode,
        status: entry?.status,
        at: entry?.at,
        label: entry?.label,
        details: entry?.details,
        sessionId: entry?.sessionId,
        actionSheetId: entry?.actionSheetId,
      })
    )
    .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
};

export const appendDeliveryTimeline = (meta: Record<string, any> = {}, entry: DeliveryTimelineEntryInput = {}) => {
  const timeline = normalizeTimeline(meta?.deliveryTimeline);
  const nextEntry = buildDeliveryTimelineEntry({
    source: entry?.source || meta?.deliverySource || meta?.sourceBatch,
    mode: entry?.mode || meta?.deliveryMode,
    status: entry?.status || meta?.executionStatus,
    at: entry?.at,
    label: entry?.label,
    details: entry?.details,
    sessionId: entry?.sessionId || meta?.executionSessionId || meta?.promoteSessionId,
    actionSheetId: entry?.actionSheetId || meta?.actionSheetId,
  });
  return {
    ...meta,
    deliveryTimeline: [...timeline, nextEntry],
  };
};

type BuildDeliveryMetaOptions = {
  source?: DeliverySource | string;
  mode?: DeliveryMode | string;
  status?: string;
  requestedAt?: string;
  sessionId?: string;
  cellId?: string;
  actionSheetId?: string;
  references?: unknown[];
  existingMeta?: Record<string, any>;
  timelineLabel?: string;
  timelineDetails?: string;
};

export const buildDeliveryMeta = ({
  source,
  mode,
  status = 'queued',
  requestedAt,
  sessionId,
  cellId,
  actionSheetId,
  references,
  existingMeta,
  timelineLabel,
  timelineDetails,
}: BuildDeliveryMetaOptions = {}) => {
  const normalizedSource = normalizeDeliverySource(source);
  const normalizedMode = normalizeDeliveryMode(mode);
  const normalizedRequestedAt = toIsoTimestamp(requestedAt);
  let nextMeta: Record<string, any> = {
    ...(existingMeta || {}),
    sourceBatch: normalizedSource,
    deliverySource: normalizedSource,
    deliveryMode: normalizedMode,
    executionStatus: String(status || 'queued').trim() || 'queued',
    executionSessionId: String(sessionId || '').trim(),
    executionRequestedAt: normalizedRequestedAt,
    executionAcknowledgedAt: existingMeta?.executionAcknowledgedAt || '',
    actionSheetId: String(actionSheetId || '').trim(),
    deliveryCellId: String(cellId || '').trim(),
    deliveryReferences: Array.isArray(references)
      ? references
      : Array.isArray(existingMeta?.deliveryReferences)
        ? existingMeta.deliveryReferences
        : [],
  };
  nextMeta = appendDeliveryTimeline(nextMeta, {
    source: normalizedSource,
    mode: normalizedMode,
    status,
    at: normalizedRequestedAt,
    label: timelineLabel || status,
    details: timelineDetails,
    sessionId,
    actionSheetId,
  });
  return nextMeta;
};

type SetDeliveryExecutionStatusOptions = {
  meta?: Record<string, any>;
  source?: DeliverySource | string;
  mode?: DeliveryMode | string;
  status?: string;
  at?: string;
  sessionId?: string;
  actionSheetId?: string;
  label?: string;
  details?: string;
};

export const setDeliveryExecutionStatus = ({
  meta,
  source,
  mode,
  status = 'running',
  at,
  sessionId,
  actionSheetId,
  label,
  details,
}: SetDeliveryExecutionStatusOptions = {}) => {
  const baseMeta = { ...(meta || {}) };
  const normalizedStatus = String(status || 'running').trim() || 'running';
  const normalizedAt = toIsoTimestamp(at);
  const normalizedSource = normalizeDeliverySource(source, normalizeDeliverySource(baseMeta?.deliverySource || baseMeta?.sourceBatch));
  const normalizedMode = normalizeDeliveryMode(mode, normalizeDeliveryMode(baseMeta?.deliveryMode));

  let nextMeta: Record<string, any> = {
    ...baseMeta,
    sourceBatch: normalizedSource,
    deliverySource: normalizedSource,
    deliveryMode: normalizedMode,
    executionStatus: normalizedStatus,
    executionSessionId: String(sessionId || baseMeta?.executionSessionId || '').trim(),
    actionSheetId: String(actionSheetId || baseMeta?.actionSheetId || '').trim(),
  };

  if (normalizedStatus === 'running') {
    nextMeta.executionStartedAt = normalizedAt;
  }
  if (normalizedStatus === 'complete' || normalizedStatus === 'failed' || normalizedStatus === 'canceled') {
    nextMeta.executionFinishedAt = normalizedAt;
  }

  nextMeta = appendDeliveryTimeline(nextMeta, {
    source: normalizedSource,
    mode: normalizedMode,
    status: normalizedStatus,
    at: normalizedAt,
    label: label || normalizedStatus,
    details,
    sessionId: nextMeta.executionSessionId,
    actionSheetId: nextMeta.actionSheetId,
  });
  return nextMeta;
};
