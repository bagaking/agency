import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ArchivedCellCard } from '../agentCells/ArchivedCellCard';
import { DetachedCellCleanupCard } from '../agentCells/DetachedCellCleanupCard';

test('DetachedCellCleanupCard uses a filled lifecycle rail shell instead of a high-contrast outline card', () => {
  const html = renderToStaticMarkup(
    <DetachedCellCleanupCard
      cell={{
        id: 'cleanup-cell',
        name: 'bounded_browser_research_lane',
        state: 'draft',
        attachmentState: 'detached',
        lastKnownWorktreePath: '/repo/.worktrees/bounded_browser_research_lane',
      }}
      sessions={[
        {
          id: 'session-a',
          status: 'stale',
        },
      ]}
      onSelect={() => undefined}
    />
  );

  assert.match(html, /rounded-\[22px\]/);
  assert.match(html, /Detached Workspace/);
  assert.doesNotMatch(html, /ring-1 ring-amber/);
});

test('ArchivedCellCard reuses the lifecycle rail shell rather than a separate outline-card language', () => {
  const html = renderToStaticMarkup(
    <ArchivedCellCard
      cell={{
        id: 'archived-cell',
        name: 'integrate-web-research-main',
        state: 'archived',
        attachmentState: 'missing',
        lastKnownWorktreePath: '/repo/.worktrees/integrate-web-research-main',
      }}
      sessions={[]}
      onSelect={() => undefined}
    />
  );

  assert.match(html, /rounded-\[22px\]/);
  assert.match(html, /Archived/);
  assert.doesNotMatch(html, /ring-1 ring-slate/);
});
