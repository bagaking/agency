const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  startDelivery,
  confirmDelivery,
} = require('../../../../../pkg/agency-data/src/promote-system/index.ts');
const {
  listHilItems,
} = require('../../../../../pkg/agency-data/src/repositories/hilRepository.ts');

async function createWorktree(prefix) {
  const worktreePath = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  return worktreePath;
}

test('session-source delivery drafts reference reply artifacts instead of HIL items', async (t) => {
  const worktreePath = await createWorktree('agency-delivery-reply-ref-');
  t.after(async () => {
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

  const run = await startDelivery({
    request: {
      worktreePath,
      source: 'session',
      mode: 'quick',
      description: 'Send follow-up reply',
      sessionId: 'session-target',
      cellId: 'cell-target',
      selectedItems: [
        {
          id: 'reply-item-1',
          kind: 'reply',
          body: 'Follow up on the failing check.',
        },
      ],
    },
    host: {
      dispatchToSession: async () => ({
        ackAt: '2026-03-31T00:05:00.000Z',
      }),
    },
  });

  assert.ok(run.draftId);

  const drafts = await listHilItems({
    worktreePath,
    kind: 'draft',
  });
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].references.length, 1);
  assert.equal(drafts[0].references[0].system, 'reply');
  assert.equal(drafts[0].references[0].id, 'reply-item-1');

  const completed = await confirmDelivery({
    worktreePath,
    draftId: run.draftId,
  });
  assert.equal(completed.meta.executionStatus, 'complete');
  assert.equal(completed.meta.promoted, true);
});

export {};
