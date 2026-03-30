import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SessionMapOperationsRail } from '../SessionMapOperationsRail';

const attentionItems = [
  {
    id: 'failed-run',
    kind: 'failed',
    ownerKind: 'run',
    severity: 'critical',
    label: 'Failed Run',
    detail: 'Primary failure.',
    refs: {
      runId: 'run-failed',
      cellId: 'cell-a',
      sessionId: 'session-a',
    },
    source: 'local',
    updatedAtMs: 3,
    count: 1,
  },
  {
    id: 'review-child',
    kind: 'return_required',
    ownerKind: 'session',
    severity: 'high',
    label: 'Review Child',
    detail: 'Child session needs review.',
    refs: {
      cellId: 'cell-a',
      sessionId: 'session-child',
    },
    source: 'local',
    updatedAtMs: 2,
    count: 1,
  },
  {
    id: 'unread-background',
    kind: 'unread',
    ownerKind: 'session',
    severity: 'medium',
    label: 'Unread Session',
    detail: 'Background output arrived.',
    refs: {
      cellId: 'cell-b',
      sessionId: 'session-b',
    },
    source: 'local',
    updatedAtMs: 1,
    count: 1,
  },
];

test('SessionMapOperationsRail renders the full priority queue without truncation', () => {
  const html = renderToStaticMarkup(
    <SessionMapOperationsRail
      focusData={{
        cell: {
          id: 'cell-a',
          name: 'alpha',
        },
        session: {
          id: 'session-a',
          name: 'Main',
        },
      }}
      attentionItems={attentionItems}
      harnessRuns={[]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
    />
  );

  assert.equal((html.match(/data-attention-item-id=/g) || []).length, 3);
  assert.match(html, /Failed Run/);
  assert.match(html, /Review Child/);
  assert.match(html, /Unread Session/);
  assert.match(html, /max-h-36/);
  assert.match(html, /truncate/);
});
