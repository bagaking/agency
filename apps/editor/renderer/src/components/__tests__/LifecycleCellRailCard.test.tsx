import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ArchivedCellCard } from '../agentCells/ArchivedCellCard';
import { DetachedCellCleanupCard } from '../agentCells/DetachedCellCleanupCard';
import { AGENT_CELLS_PANEL_BASE } from '../agentCells/surfaceTokens';

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

  assert.equal(html.includes(AGENT_CELLS_PANEL_BASE), true);
  assert.equal(html.includes('rgba(37,29,21,0.965),rgba(20,16,12,0.99)'), true);
  assert.equal(html.includes('Detached Workspace'), true);
  assert.equal(html.includes('ring-1 ring-amber'), false);
  assert.equal(html.includes('border-amber'), false);
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

  assert.equal(html.includes(AGENT_CELLS_PANEL_BASE), true);
  assert.equal(html.includes('rgba(26,30,36,0.965),rgba(16,19,23,0.99)'), true);
  assert.equal(html.includes('Archived'), true);
  assert.equal(html.includes('ring-1 ring-slate'), false);
  assert.equal(html.includes('border-slate'), false);
});
