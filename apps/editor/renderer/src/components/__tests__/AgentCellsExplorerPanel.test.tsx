import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AgentCellsExplorerPanel } from '../agentCells/AgentCellsExplorerPanel';

test('AgentCellsExplorerPanel enables Explorer access for project-root cells', () => {
  const html = renderToStaticMarkup(
    <AgentCellsExplorerPanel
      projectReady={true}
      selectedCell={{
        id: 'cell-project-root',
        name: 'research-desk',
        attachmentState: 'project_root',
        projectRoot: '/repo',
      }}
    />
  );

  assert.match(html, /data-testid="agent-cells-file-dashboard-toggle"/);
  assert.doesNotMatch(html, /data-testid="agent-cells-file-dashboard-toggle"[^>]*disabled/);
});

test('AgentCellsExplorerPanel keeps Explorer disabled when a Cell has no usable runtime root', () => {
  const html = renderToStaticMarkup(
    <AgentCellsExplorerPanel
      projectReady={true}
      selectedCell={{
        id: 'cell-missing-root',
        name: 'orphan',
        attachmentState: 'project_root',
        projectRoot: '',
      }}
    />
  );

  assert.match(html, /disabled=""[^>]*data-testid="agent-cells-file-dashboard-toggle"/);
});
