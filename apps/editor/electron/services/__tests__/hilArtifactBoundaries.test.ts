const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');

const {
  createHilItem,
  getHilIndexPath,
  listHilItems,
} = require('../../../../../pkg/agency-data/src/repositories/hilRepository.ts');
const {
  listSessionReplies,
} = require('../../../../../pkg/agency-data/src/repositories/sessionReplyRepository.ts');

async function createWorktree(prefix) {
  const worktreePath = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  return worktreePath;
}

test('createHilItem rejects reply as an HIL kind', async (t) => {
  const worktreePath = await createWorktree('agency-hil-boundary-');
  t.after(async () => {
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

  await assert.rejects(
    createHilItem({
      worktreePath,
      kind: 'reply',
      body: 'should not enter HIL',
    }),
    /comment, memo, or draft/
  );
});

test('legacy HIL replies migrate into the session-reply store and disappear from HIL queries', async (t) => {
  const worktreePath = await createWorktree('agency-hil-reply-import-');
  t.after(async () => {
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

  const indexPath = getHilIndexPath(worktreePath);
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(
    indexPath,
    yaml.dump({
      version: 1,
      items: [
        {
          id: 'reply-legacy-1',
          kind: 'reply',
          status: 'open',
          createdAt: '2026-03-31T00:00:00.000Z',
          body: 'Ship the patch after the checks pass.',
          meta: {
            source: 'reply-panel',
            session: {
              cellId: 'cell-a',
              cellName: 'Cell A',
              sessionId: 'session-a',
              sessionName: 'Session A',
            },
            selection: {
              text: 'selection',
              site: 'Selection site',
              timeTag: '00:03',
              query: 'Ship the patch after the checks pass.',
            },
            sent: {
              targets: [
                {
                  type: 'record',
                  at: '2026-03-31T00:00:00.000Z',
                  cellId: 'cell-a',
                  sessionId: 'session-a',
                  cellName: 'Cell A',
                  sessionName: 'Session A',
                  avatar: 'codex',
                },
              ],
            },
          },
        },
        {
          id: 'comment-1',
          kind: 'comment',
          status: 'open',
          createdAt: '2026-03-31T00:01:00.000Z',
          body: 'keep this in HIL',
          anchor: {
            file: 'src/app.ts',
            line: 12,
            column: 3,
          },
          references: [],
          meta: {
            processed: false,
          },
        },
      ],
    }),
    'utf8'
  );

  const visibleHilItems = await listHilItems({
    worktreePath,
    kind: 'all',
  });
  assert.deepEqual(visibleHilItems.map((item) => item.kind), ['comment']);

  const replies = await listSessionReplies({
    worktreePath,
    cellId: 'cell-a',
    sessionId: 'session-a',
  });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].kind, 'reply');
  assert.equal(replies[0].owner.cellId, 'cell-a');
  assert.equal(replies[0].owner.sessionId, 'session-a');
  assert.equal(replies[0].capture.selection.site, 'Selection site');

  const rawHilIndex = await fs.readFile(indexPath, 'utf8');
  assert.doesNotMatch(rawHilIndex, /kind:\s+reply/);
});

export {};
