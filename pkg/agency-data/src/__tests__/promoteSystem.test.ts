import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  confirmDelivery,
  getDeliveryStatus,
  getDeliveryTimeline,
  startDelivery,
} from '../promote-system';
import { createSessionReply, listSessionReplies } from '../repositories/sessionReplyRepository';

async function createTempDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('promote-system supports repo-owned delivery flows without a live worktree', async (t) => {
  const repoRoot = await createTempDir('agency-promote-system-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const run = await startDelivery({
    request: {
      repoRootPath: repoRoot,
      cellId: 'cell-1',
      source: 'session',
      mode: 'quick',
      description: 'Ship the fix',
      sessionId: 'sess-1',
      selectedItems: [],
    },
    host: {
      async dispatchToSession() {
        return { ackAt: '2026-03-31T00:00:01.000Z' };
      },
    },
  });

  assert.ok(run.draftId);

  const status = await getDeliveryStatus({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    draftId: run.draftId,
  });
  assert.equal(status?.draft?.meta?.executionStatus, 'running');

  await confirmDelivery({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    draftId: run.draftId,
  });

  const confirmedStatus = await getDeliveryStatus({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    draftId: run.draftId,
  });
  assert.equal(confirmedStatus?.draft?.meta?.executionStatus, 'complete');

  const timeline = await getDeliveryTimeline({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
  });
  assert.ok(timeline.length >= 3);
  assert.ok(timeline.some((entry) => entry.status === 'complete'));
});

test('promote-system creates gated action sheets from repo root when no live worktree exists', async (t) => {
  const repoRoot = await createTempDir('agency-promote-gated-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const run = await startDelivery({
    request: {
      repoRootPath: repoRoot,
      cellId: 'cell-2',
      source: 'promote',
      mode: 'gated',
      description: 'Review the gated plan',
      sessionId: 'sess-2',
      selectedItems: [],
    },
    host: {
      async dispatchToSession() {
        return { ackAt: '2026-03-31T00:00:01.000Z' };
      },
    },
  });

  assert.ok(run.actionSheetId);
  const planPath = path.join(repoRoot, '.agency', 'action-sheets', run.actionSheetId, 'plan.md');
  const promptPath = path.join(repoRoot, '.agency', 'action-sheets', run.actionSheetId, 'prompt.json');
  const statusPath = path.join(repoRoot, '.agency', 'action-sheets', run.actionSheetId, 'status.json');

  const [planRaw, promptRaw, statusRaw] = await Promise.all([
    fs.readFile(planPath, 'utf8'),
    fs.readFile(promptPath, 'utf8'),
    fs.readFile(statusPath, 'utf8'),
  ]);

  assert.match(planRaw, /Completion marker/);
  assert.match(promptRaw, /Review the gated plan/);
  assert.match(statusRaw, /queued|running/);
});

test('confirmDelivery marks source-cell references processed when delivery runs in another cell', async (t) => {
  const repoRoot = await createTempDir('agency-promote-cross-cell-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const sourceReply = await createSessionReply({
    worktreePath: repoRoot,
    body: 'Cross-cell reply',
    owner: {
      cellId: 'source-cell',
      sessionId: 'sess-source',
    },
    capture: {
      source: 'reply-panel',
      selection: {
        text: '',
        site: 'Selection site',
        timeTag: '00:03',
        query: 'Cross-cell reply',
      },
    },
  });

  const run = await startDelivery({
    request: {
      repoRootPath: repoRoot,
      cellId: 'target-cell',
      source: 'session',
      mode: 'quick',
      description: 'Dispatch cross-cell reply',
      sessionId: 'sess-target',
      selectedItems: [
        {
          id: sourceReply.id,
          kind: sourceReply.kind,
          body: sourceReply.body,
          cellId: 'source-cell',
          references: [],
        },
      ],
    },
    host: {
      async dispatchToSession() {
        return { ackAt: '2026-03-31T00:00:01.000Z' };
      },
    },
  });

  await confirmDelivery({
    repoRootPath: repoRoot,
    cellId: 'target-cell',
    draftId: run.draftId,
  });

  const sourceItems = await listSessionReplies({
    worktreePath: repoRoot,
    cellId: 'source-cell',
    sessionId: 'sess-source',
    includeArchived: true,
  });
  assert.equal(sourceItems.length, 1);
  assert.equal(sourceItems[0]?.delivery?.draftId, run.draftId);
  assert.equal(sourceItems[0]?.delivery?.targetSession?.cellId, 'target-cell');
  assert.equal(sourceItems[0]?.delivery?.targetSession?.sessionId, 'sess-target');
});
