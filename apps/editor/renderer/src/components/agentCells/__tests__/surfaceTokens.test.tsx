import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AttentionPill } from '../../attention/AttentionPill';
import {
  AGENT_CELLS_PANEL_BASE,
  buildAgentCellsAttentionPillClass,
  buildAgentCellsBadgeClass,
  buildAgentCellsGhostControlClass,
  buildAgentCellsPrimaryActionClass,
} from '../surfaceTokens';

const BORDER_UTILITY_PATTERN = /(^|\s)border(?:\b|-)/;
const WHITE_INSET_PATTERN = /inset_0_1px_0_rgba\(255,255,255/i;

test('Agent Cells shared shell tokens stay mass-first and avoid border-owned grammar', () => {
  const samples = [
    AGENT_CELLS_PANEL_BASE,
    buildAgentCellsBadgeClass('default'),
    buildAgentCellsGhostControlClass(),
    buildAgentCellsPrimaryActionClass('sky'),
    buildAgentCellsAttentionPillClass('unread'),
  ];

  samples.forEach((sample) => {
    assert.doesNotMatch(sample, BORDER_UTILITY_PATTERN);
    assert.doesNotMatch(sample, WHITE_INSET_PATTERN);
  });
});

test('AttentionPill agentCells variant renders as a dark micro-plate instead of a rounded border pill', () => {
  const html = renderToStaticMarkup(
    <AttentionPill item={{ kind: 'unread', label: 'Unread', detail: 'Needs review' } as any} count={2} variant="agentCells" />
  );

  assert.doesNotMatch(html, /rounded-full border/);
  assert.doesNotMatch(html, WHITE_INSET_PATTERN);
  assert.match(html, /rounded-\[7px\]/);
});
