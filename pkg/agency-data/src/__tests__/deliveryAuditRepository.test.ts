import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  appendDeliveryAuditEvent,
  getDeliveryAuditLogPath,
  readDeliveryAuditTimeline,
} from '../repositories/deliveryAuditRepository';

async function createTempDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('appendDeliveryAuditEvent writes repo-owned delivery logs under the cell store', async (t) => {
  const repoRoot = await createTempDir('agency-delivery-audit-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await appendDeliveryAuditEvent({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    event: {
      source: 'session',
      mode: 'quick',
      status: 'queued',
      label: 'Queued',
    },
  });

  const logPath = getDeliveryAuditLogPath({ repoRootPath: repoRoot, cellId: 'cell-1' });
  const raw = await fs.readFile(logPath, 'utf8');
  assert.match(logPath, /\/\.agency\/cells\/cell-1\/delivery\/events\.jsonl$/);
  assert.match(raw, /"status":"queued"/);

  const timeline = await readDeliveryAuditTimeline({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
  });
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0]?.status, 'queued');
});

test('readDeliveryAuditTimeline migrates legacy worktree logs into repo-owned cell storage', async (t) => {
  const repoRoot = await createTempDir('agency-delivery-audit-migrate-');
  const worktreePath = path.join(repoRoot, 'worktrees', 'cell-a');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const legacyLogPath = getDeliveryAuditLogPath(worktreePath);
  await fs.mkdir(path.dirname(legacyLogPath), { recursive: true });
  await fs.writeFile(
    legacyLogPath,
    `${JSON.stringify({
      at: '2026-03-31T00:00:00.000Z',
      source: 'promote',
      mode: 'quick',
      status: 'complete',
      label: 'Legacy complete',
    })}\n`,
    'utf8'
  );

  const timeline = await readDeliveryAuditTimeline({
    repoRootPath: repoRoot,
    cellId: 'cell-a',
    worktreePath,
  });

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0]?.label, 'Legacy complete');

  const repoOwnedLogPath = getDeliveryAuditLogPath({ repoRootPath: repoRoot, cellId: 'cell-a' });
  const migratedRaw = await fs.readFile(repoOwnedLogPath, 'utf8');
  assert.match(migratedRaw, /Legacy complete/);
});
