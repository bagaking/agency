import {
  appendDeliveryAuditEvent,
  readDeliveryAuditTimeline,
  type DeliveryAuditEvent,
} from '../repositories/deliveryAuditRepository';
import {
  createActionSheet,
  readActionSheet,
  updateActionSheetChecks,
  updateActionSheetPlan,
  updateActionSheetPrompt,
} from '../repositories/actionSheetsRepository';
import {
  createHilItem,
  listHilItems,
  updateHilItem,
} from '../repositories/hilRepository';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type DeliverySource = 'promote' | 'explorer' | 'session';
export type DeliveryMode = 'quick' | 'gated';

export type DeliveryHostAdapter = {
  dispatchToSession(input: {
    cellId?: string;
    sessionId: string;
    command: string;
    label?: string;
    appendEnter?: boolean;
    doubleEnter?: boolean;
  }): Promise<{ ackAt: string }>;
  focusSession?(input: { cellId?: string; sessionId: string }): Promise<void> | void;
  openTerminal?(): Promise<void> | void;
};

export type DeliveryRequest = {
  worktreePath: string;
  source: DeliverySource;
  mode: DeliveryMode;
  description: string;
  sessionId: string;
  cellId?: string;
  selectedItems: Array<{
    id: string;
    kind: string;
    body: string;
    anchor?: { file?: string; line?: number; column?: number } | null;
    references?: Array<Record<string, unknown>>;
  }>;
  metadata?: Record<string, unknown>;
  dispatch?: {
    label?: string;
    appendEnter?: boolean;
    doubleEnter?: boolean;
  };
};

export type DeliveryRun = {
  draftId: string;
  actionSheetId: string;
  source: DeliverySource;
  mode: DeliveryMode;
  sessionId: string;
  cellId: string;
  requestedAt: string;
  startedAt: string;
  acknowledgedAt: string;
  status: string;
};

type DeliveryTimelineEntry = {
  id: string;
  at: string;
  source: DeliverySource;
  mode: DeliveryMode;
  status: string;
  label: string;
  details?: string;
  sessionId?: string;
  actionSheetId?: string;
};

function escapeRegex(value: string): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildActionSheetCompletion(sheetId: string) {
  const id = String(sheetId || '').trim();
  const planPath = `.agency/action-sheets/${id}/plan.md`;
  const marker = `Completion marker: ${id}`;
  const done = [
    'When the work is finished, update the completion checklist line below.',
    `File: ${planPath}`,
    `- [x] ${marker}`,
  ].join('\n');
  const checkCommand = `rg -n "^\\- \\[x\\] ${escapeRegex(marker)}\\s*$" ${planPath}`;
  return {
    marker,
    done,
    checks: [
      {
        label: 'Completion marker',
        commands: [checkCommand],
      },
    ],
  };
}

function buildActionSheetPlan({ title, marker }: { title: string; marker: string }) {
  const planTitle = String(title || 'Action Sheet');
  const completionMarker = String(marker || 'Completion marker');
  return [
    `# ${planTitle}`,
    '',
    '## Checklist',
    '- [ ] Review requirements',
    '- [ ] Run in session',
    '',
    '## Completion',
    `- [ ] ${completionMarker}`,
    '',
  ].join('\n');
}

async function resolveRepoRootPath(worktreePath: string): Promise<string> {
  if (!worktreePath) {
    return '';
  }
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: worktreePath,
      timeout: 2000,
    });
    const root = String(stdout || '').trim();
    return root || worktreePath;
  } catch (_error) {
    return worktreePath;
  }
}

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

const normalizeMode = (value: unknown): DeliveryMode => (String(value || '').trim().toLowerCase() === 'gated' ? 'gated' : 'quick');
const normalizeSource = (value: unknown): DeliverySource => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'explorer') {
    return 'explorer';
  }
  if (normalized === 'session') {
    return 'session';
  }
  return 'promote';
};

const buildTimelineEntry = ({
  at,
  source,
  mode,
  status,
  label,
  details,
  sessionId,
  actionSheetId,
}: Partial<DeliveryTimelineEntry> = {}): DeliveryTimelineEntry => {
  const normalizedAt = toIsoTimestamp(at);
  const normalizedSource = normalizeSource(source);
  const normalizedMode = normalizeMode(mode);
  const normalizedStatus = String(status || 'queued').trim() || 'queued';
  const normalizedLabel = String(label || '').trim() || normalizedStatus;
  return {
    id: `${normalizedAt}:${normalizedStatus}:${normalizedMode}`,
    at: normalizedAt,
    source: normalizedSource,
    mode: normalizedMode,
    status: normalizedStatus,
    label: normalizedLabel,
    details: String(details || '').trim() || undefined,
    sessionId: String(sessionId || '').trim() || undefined,
    actionSheetId: String(actionSheetId || '').trim() || undefined,
  };
};

const appendTimeline = (meta: Record<string, any>, entry: Partial<DeliveryTimelineEntry>) => {
  const current = Array.isArray(meta?.deliveryTimeline) ? meta.deliveryTimeline : [];
  const normalized = current
    .map((existing) => buildTimelineEntry(existing))
    .sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  return {
    ...meta,
    deliveryTimeline: [...normalized, buildTimelineEntry(entry)],
  };
};

function resolveDispatchCommand(request: DeliveryRequest): string {
  const override = String(request?.metadata?.command || request?.metadata?.promptText || '').trim();
  if (override) {
    return override;
  }
  const lines: string[] = ['<delivery>'];
  lines.push(`source: ${request.source}`);
  lines.push(`mode: ${request.mode}`);
  lines.push(`session_id: ${request.sessionId}`);
  lines.push('</delivery>');
  lines.push('');
  lines.push('<context>');
  if (request.selectedItems?.length) {
    request.selectedItems.forEach((item) => {
      const anchor = item.anchor?.file ? `${item.anchor.file}${item.anchor.line ? `:${item.anchor.line}` : ''}` : '';
      lines.push(`- [${item.kind}] ${item.body || '(empty)'}${anchor ? ` (${anchor})` : ''}`);
    });
  } else {
    lines.push('- No selected items.');
  }
  lines.push('</context>');
  lines.push('<query>');
  lines.push(request.description || 'Process selected content.');
  lines.push('</query>');
  return lines.join('\n');
}

function buildDeliveryMeta({
  source,
  mode,
  status,
  requestedAt,
  sessionId,
  cellId,
  actionSheetId,
  references,
  existingMeta,
  label,
  details,
}: {
  source: DeliverySource;
  mode: DeliveryMode;
  status: string;
  requestedAt: string;
  sessionId: string;
  cellId: string;
  actionSheetId: string;
  references: unknown[];
  existingMeta?: Record<string, any>;
  label?: string;
  details?: string;
}): Record<string, any> {
  let meta: Record<string, any> = {
    ...(existingMeta || {}),
    sourceBatch: source,
    deliverySource: source,
    deliveryMode: mode,
    executionStatus: status,
    executionSessionId: sessionId,
    executionRequestedAt: requestedAt,
    actionSheetId,
    deliveryCellId: cellId,
    deliveryReferences: references,
  };
  meta = appendTimeline(meta, {
    source,
    mode,
    status,
    at: requestedAt,
    label: label || status,
    details,
    sessionId,
    actionSheetId,
  });
  return meta;
}

async function markExecutionStatus({
  worktreePath,
  draftId,
  source,
  mode,
  status,
  at,
  sessionId,
  actionSheetId,
  label,
  details,
}: {
  worktreePath: string;
  draftId: string;
  source: DeliverySource;
  mode: DeliveryMode;
  status: string;
  at: string;
  sessionId: string;
  actionSheetId: string;
  label: string;
  details?: string;
}) {
  const list = await listHilItems({ worktreePath, kind: 'draft' });
  const draft = (Array.isArray(list) ? list : []).find((item: any) => item?.id === draftId) || null;
  const baseMeta = (draft?.meta && typeof draft.meta === 'object') ? { ...draft.meta } : {};
  let nextMeta: Record<string, any> = {
    ...baseMeta,
    sourceBatch: source,
    deliverySource: source,
    deliveryMode: mode,
    executionStatus: status,
    executionSessionId: sessionId || baseMeta.executionSessionId || '',
    actionSheetId: actionSheetId || baseMeta.actionSheetId || '',
  };
  if (status === 'running') {
    nextMeta.executionStartedAt = at;
  }
  if (status === 'complete' || status === 'failed' || status === 'canceled') {
    nextMeta.executionFinishedAt = at;
  }
  nextMeta = appendTimeline(nextMeta, {
    source,
    mode,
    status,
    at,
    label,
    details,
    sessionId,
    actionSheetId,
  });
  const updated = await updateHilItem({
    worktreePath,
    itemId: draftId,
    patch: { meta: nextMeta },
  });
  return updated || draft;
}

export async function startDelivery({
  request,
  host,
}: {
  request: DeliveryRequest;
  host: DeliveryHostAdapter;
}): Promise<DeliveryRun> {
  if (!request?.worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!request?.description || !String(request.description).trim()) {
    throw new Error('description is required.');
  }
  if (!request?.sessionId) {
    throw new Error('sessionId is required.');
  }
  const source = normalizeSource(request.source);
  const mode = normalizeMode(request.mode);
  const worktreePath = request.worktreePath;
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  const sessionId = request.sessionId;
  const cellId = String(request.cellId || '').trim();
  const requestedAt = new Date().toISOString();
  const references = (Array.isArray(request.selectedItems) ? request.selectedItems : []).map((item) => ({
    system: source === 'explorer' ? 'explorer' : 'hil',
    id: item.id,
    path: item.anchor?.file || null,
    line: item.anchor?.line || null,
    kind: item.kind || null,
  }));

  let actionSheetId = '';
  if (mode === 'gated') {
    const titlePrefix = source === 'explorer' ? 'Feed' : source === 'session' ? 'Session' : 'Promote';
    const title = `${titlePrefix}: ${String(request.description).trim().slice(0, 32)}`;
    const promptText = resolveDispatchCommand({ ...request, source, mode });
    const sheet = await createActionSheet({
      worktreePath,
      repoRootPath,
      payload: {
        title,
        prompt: {
          requirements: String(request.description).trim(),
          context: promptText,
          checks: '',
          done: '',
        },
        checks: [],
        conditional: request?.metadata?.conditional || undefined,
      },
    });
    actionSheetId = sheet?.id || '';
    if (!actionSheetId) {
      throw new Error('Unable to create Action Sheet.');
    }
    const completion = buildActionSheetCompletion(actionSheetId);
    await updateActionSheetPlan({
      worktreePath,
      repoRootPath,
      id: actionSheetId,
      plan: buildActionSheetPlan({ title, marker: completion.marker }),
    });
    await updateActionSheetPrompt({
      worktreePath,
      repoRootPath,
      id: actionSheetId,
      prompt: {
        requirements: String(request.description).trim(),
        context: promptText,
        checks: '',
        done: completion.done,
      },
    });
    await updateActionSheetChecks({
      worktreePath,
      repoRootPath,
      id: actionSheetId,
      checks: completion.checks,
    });
  }

  const seedMeta = buildDeliveryMeta({
    source,
    mode,
    status: 'queued',
    requestedAt,
    sessionId,
    cellId,
    actionSheetId: actionSheetId || (mode === 'gated' ? '(pending)' : ''),
    references,
    existingMeta: request.metadata && typeof request.metadata === 'object' ? (request.metadata as Record<string, any>) : {},
    label: mode === 'gated' ? 'Queued gated delivery' : 'Queued quick delivery',
  });

  const draft = await createHilItem({
    worktreePath,
    kind: 'draft',
    body: String(request.description).trim(),
    references,
    meta: {
      ...seedMeta,
      actionSheetId,
    },
  });

  await appendDeliveryAuditEvent({
    worktreePath,
    event: {
      at: requestedAt,
      source,
      mode,
      status: 'queued',
      label: mode === 'gated' ? 'Queued gated delivery' : 'Queued quick delivery',
      sessionId,
      cellId,
      actionSheetId,
      draftId: draft.id,
      references,
    },
  });

  const dispatchCommand = resolveDispatchCommand({ ...request, source, mode });
  const sourceLabel = source === 'explorer' ? 'Explorer' : source === 'session' ? 'Session' : 'Promote';
  const ack = await host.dispatchToSession({
    cellId: cellId || undefined,
    sessionId,
    command: dispatchCommand,
    label: String(request.dispatch?.label || '').trim() || `${sourceLabel} (${mode})`,
    appendEnter: request.dispatch?.appendEnter !== false,
    doubleEnter: request.dispatch?.doubleEnter !== false,
  });
  const startedAt = new Date().toISOString();
  await markExecutionStatus({
    worktreePath,
    draftId: draft.id,
    source,
    mode,
    status: 'running',
    at: startedAt,
    sessionId,
    actionSheetId,
    label: mode === 'gated' ? 'Gated delivery dispatched' : 'Quick delivery dispatched',
  });

  const acknowledgedAt = toIsoTimestamp(ack?.ackAt || startedAt);
  await appendDeliveryAuditEvent({
    worktreePath,
    event: {
      at: acknowledgedAt,
      source,
      mode,
      status: 'running',
      label: mode === 'gated' ? 'Gated delivery dispatched' : 'Quick delivery dispatched',
      sessionId,
      cellId,
      actionSheetId,
      draftId: draft.id,
      references,
    },
  });

  return {
    draftId: draft.id,
    actionSheetId: actionSheetId || '',
    source,
    mode,
    sessionId,
    cellId,
    requestedAt,
    startedAt,
    acknowledgedAt,
    status: 'running',
  };
}

export async function confirmDelivery({
  worktreePath,
  draftId,
}: {
  worktreePath: string;
  draftId: string;
}): Promise<Record<string, any> | null> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!draftId) {
    throw new Error('draftId is required.');
  }
  const list = await listHilItems({ worktreePath, kind: 'all' });
  const items = Array.isArray(list) ? list : [];
  const draft = items.find((item: any) => item?.id === draftId) || null;
  if (!draft) {
    return null;
  }
  const references = Array.isArray(draft.references) ? draft.references : [];
  const promotedAt = new Date().toISOString();
  await Promise.all(
    references
      .filter((ref: any) => ref?.system === 'hil' && ref?.id)
      .map((ref: any) =>
        updateHilItem({
          worktreePath,
          itemId: ref.id,
          patch: {
            meta: {
              processed: true,
              promotedDraftId: draftId,
              promoteSessionId: draft.meta?.executionSessionId || null,
              promotedAt,
            },
          },
        }).catch(() => null)
      )
  );

  const source = normalizeSource(draft.meta?.deliverySource || draft.meta?.sourceBatch);
  const mode = normalizeMode(draft.meta?.deliveryMode);
  const sessionId = String(draft.meta?.executionSessionId || '').trim();
  const actionSheetId = String(draft.meta?.actionSheetId || '').trim();

  const completed = await markExecutionStatus({
    worktreePath,
    draftId,
    source,
    mode,
    status: 'complete',
    at: promotedAt,
    sessionId,
    actionSheetId,
    label: 'Delivery confirmed',
    details: 'Referenced items were marked processed.',
  });
  const completedWithMeta = completed?.id
    ? await updateHilItem({
        worktreePath,
        itemId: completed.id,
        patch: {
          meta: {
            promoted: true,
            executionAcknowledgedAt: promotedAt,
          },
        },
      })
    : completed;

  await appendDeliveryAuditEvent({
    worktreePath,
    event: {
      at: promotedAt,
      source,
      mode,
      status: 'complete',
      label: 'Delivery confirmed',
      sessionId,
      actionSheetId,
      draftId,
      references,
    },
  });

  return completedWithMeta || completed;
}

export async function getDeliveryStatus({
  worktreePath,
  draftId,
}: {
  worktreePath: string;
  draftId: string;
}): Promise<Record<string, any> | null> {
  if (!worktreePath) {
    throw new Error('worktreePath is required.');
  }
  if (!draftId) {
    throw new Error('draftId is required.');
  }
  const drafts = await listHilItems({ worktreePath, kind: 'draft' });
  const draft = (Array.isArray(drafts) ? drafts : []).find((item: any) => item?.id === draftId) || null;
  if (!draft) {
    return null;
  }
  const repoRootPath = await resolveRepoRootPath(worktreePath);
  const actionSheetId = String(draft.meta?.actionSheetId || '').trim();
  const actionSheet = actionSheetId
    ? await readActionSheet({ worktreePath, repoRootPath, id: actionSheetId })
    : null;
  return {
    draftId,
    executionStatus: draft.meta?.executionStatus || 'idle',
    deliverySource: draft.meta?.deliverySource || draft.meta?.sourceBatch || 'promote',
    deliveryMode: draft.meta?.deliveryMode || 'quick',
    sessionId: draft.meta?.executionSessionId || '',
    actionSheetId,
    actionSheetStatus: actionSheet?.status || null,
    draft: draft || null,
  };
}

export async function getDeliveryTimeline({
  worktreePath,
  source,
  mode,
  limit,
}: {
  worktreePath: string;
  source?: DeliverySource;
  mode?: DeliveryMode;
  limit?: number;
}): Promise<DeliveryAuditEvent[]> {
  return readDeliveryAuditTimeline({
    worktreePath,
    source,
    mode,
    limit,
  });
}
