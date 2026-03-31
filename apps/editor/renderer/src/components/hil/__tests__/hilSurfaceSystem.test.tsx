import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HIL_MEMO_SECTION_DEFS,
  HIL_SURFACE_COPY,
  resolveHilDrawerMeta,
} from '../hilSurfaceSystem';

test('HIL memo section defs keep Memo sections stable and reply-free', () => {
  assert.deepEqual(
    HIL_MEMO_SECTION_DEFS.map((section) => section.id),
    ['comments', 'flash', 'excerpt', 'screenshot']
  );
  assert.equal(
    HIL_MEMO_SECTION_DEFS.some((section) => section.id === 'reply'),
    false
  );
});

test('resolveHilDrawerMeta keeps Memo as the primary UI noun', () => {
  const memoMeta = resolveHilDrawerMeta({
    activeView: 'memo',
    hilDrawerPanel: 'comments',
    hilReplyProps: null,
    hilSubtitle: '',
  });
  const commentsMeta = resolveHilDrawerMeta({
    activeView: 'explorer',
    hilDrawerPanel: 'comments',
    hilReplyProps: null,
    hilSubtitle: '',
  });

  assert.equal(memoMeta.title, HIL_SURFACE_COPY.workspaceTitle);
  assert.equal(memoMeta.eyebrow, HIL_SURFACE_COPY.workspaceEyebrow);
  assert.equal(memoMeta.subtitle, HIL_SURFACE_COPY.captureSubtitle);
  assert.equal(commentsMeta.title, HIL_SURFACE_COPY.commentsTitle);
  assert.equal(commentsMeta.subtitle, HIL_SURFACE_COPY.commentsSubtitle);
});

test('resolveHilDrawerMeta keeps reply isolated from Memo chrome wording', () => {
  const replyMeta = resolveHilDrawerMeta({
    activeView: 'agent-cells',
    hilDrawerPanel: 'reply',
    hilReplyProps: {
      session: {
        id: 'session-a',
        name: 'Session A',
      },
    },
    hilSubtitle: '',
  });

  assert.equal(replyMeta.title, HIL_SURFACE_COPY.replyTitle);
  assert.equal(replyMeta.eyebrow, HIL_SURFACE_COPY.replyEyebrow);
  assert.equal(replyMeta.subtitle, 'Session A');
  assert.deepEqual(replyMeta.panels, [{ id: 'reply', label: 'Reply' }]);
});

export {};
