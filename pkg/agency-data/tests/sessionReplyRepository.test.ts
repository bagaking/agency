import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';

import {
  createHilItem,
  getHilIndexPath,
  listHilItems,
} from '../src/repositories/hilRepository';
import {
  createSessionReply,
  listSessionReplies,
  updateSessionReply,
} from '../src/repositories/sessionReplyRepository';
import { startDelivery } from '../src/promote-system';

function createTempWorktree(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agency-session-replies-'));
}

async function writeLegacyHilReply(worktreePath: string): Promise<string> {
  const worktreeName = path.basename(worktreePath);
  const indexPath = getHilIndexPath(worktreePath);
  const replyId = 'reply_legacy_1';
  await fs.promises.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.promises.writeFile(
    indexPath,
    yaml.dump({
      version: 1,
      items: [
        {
          id: replyId,
          kind: 'reply',
          status: 'open',
          createdAt: '2026-03-31T00:00:00.000Z',
          updatedAt: null,
          body: 'Legacy reply',
          meta: {
            source: 'reply-panel',
            selection: {
              site: 'legacy-site',
              timeTag: 'T-1',
            },
            session: {
              cellId: 'cell-a',
              cellName: 'Cell A',
              sessionId: 'session-a',
              sessionName: 'Session A',
            },
            sent: {
              targets: [{ type: 'record' }],
            },
          },
        },
      ],
    }),
    'utf-8'
  );
  const artifactPath = path.join(
    worktreePath,
    '.agency',
    'hil',
    worktreeName,
    'items',
    'reply',
    `${replyId}.yaml`
  );
  await fs.promises.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.promises.writeFile(
    artifactPath,
    yaml.dump({
      id: replyId,
      kind: 'reply',
      body: 'Legacy reply',
      meta: {
        session: {
          cellId: 'cell-a',
          sessionId: 'session-a',
        },
      },
    }),
    'utf-8'
  );
  return replyId;
}

test('HIL repository rejects reply kind creation', async () => {
  const worktreePath = createTempWorktree();
  await assert.rejects(
    () =>
      createHilItem({
        worktreePath,
        kind: 'reply' as any,
        body: 'should fail',
      }),
    /comment, memo, or draft/
  );
});

test('session reply repository migrates legacy HIL reply records', async () => {
  const worktreePath = createTempWorktree();
  const replyId = await writeLegacyHilReply(worktreePath);

  const replies = await listSessionReplies({
    worktreePath,
    cellId: 'cell-a',
    sessionId: 'session-a',
    includeArchived: true,
  });
  assert.equal(replies.length, 1);
  assert.equal(replies[0]?.id, replyId);
  assert.equal(replies[0]?.owner.cellId, 'cell-a');
  assert.equal(replies[0]?.owner.sessionId, 'session-a');

  const hilItems = await listHilItems({
    worktreePath,
    kind: 'all',
    status: 'all',
  });
  assert.equal(hilItems.length, 0);
});

test('session delivery drafts reference reply artifacts instead of HIL', async () => {
  const worktreePath = createTempWorktree();
  const reply = await createSessionReply({
    worktreePath,
    body: 'Route this reply',
    owner: {
      cellId: 'cell-a',
      cellName: 'Cell A',
      sessionId: 'session-a',
      sessionName: 'Session A',
    },
    capture: {
      source: 'reply-panel',
      selection: {
        text: '',
        site: 'selection',
        timeTag: 'Now',
        query: 'Route this reply',
      },
    },
  });

  await startDelivery({
    request: {
      worktreePath,
      source: 'session',
      mode: 'quick',
      description: 'Send reply',
      sessionId: 'session-b',
      cellId: 'cell-b',
      selectedItems: [
        {
          id: reply.id,
          kind: reply.kind,
          body: reply.body,
          references: [],
        },
      ],
    },
    host: {
      dispatchToSession: async () => ({ ackAt: '2026-03-31T00:00:01.000Z' }),
    },
  });

  const drafts = await listHilItems({
    worktreePath,
    kind: 'draft',
    status: 'all',
  });
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.references?.[0]?.system, 'reply');
  assert.equal(drafts[0]?.references?.[0]?.id, reply.id);

  const archivedReply = await updateSessionReply({
    worktreePath,
    replyId: reply.id,
    patch: {
      status: 'archived',
    },
  });
  assert.equal(archivedReply.status, 'archived');
});
