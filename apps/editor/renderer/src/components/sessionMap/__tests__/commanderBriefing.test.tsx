import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SessionMapCommanderPanel } from '../SessionMapCommanderPanel';
import { SessionMapCommanderBriefingPanel } from '../SessionMapCommanderBriefingPanel';

const runningRun = {
  runId: 'run-1',
  status: 'running',
  caller: {
    sourceSurface: 'agent-cells',
    callerId: 'commander-smart-fork',
  },
  goal: {
    title: 'Create Child Agent via Fork',
  },
  runner: {
    providerId: 'codex_cli',
  },
};

const nonCommanderRunningRun = {
  runId: 'run-2',
  status: 'running',
  caller: {
    sourceSurface: 'session-map',
    callerId: 'non-commander-run',
  },
  goal: {
    title: 'Background Inspect',
  },
  runner: {
    providerId: 'codex_cli',
  },
};

const focusData = {
  cell: {
    id: 'cell-main',
    name: 'main',
  },
  session: {
    id: 'session-ui',
    name: 'UI',
    status: 'active',
  },
};

test('commander panel exposes a right-edge briefing affordance', () => {
  const html = renderToStaticMarkup(
    <SessionMapCommanderPanel
      harnessRuns={[runningRun]}
      briefingOpen={false}
      onOpenBriefing={() => undefined}
      buttonRef={createRef()}
    />
  );

  assert.match(html, /data-commander-trigger="true"/);
  assert.match(html, /Commander/);
  assert.match(html, /Open briefing/);
});

test('commander panel shows a progress bar for active commander tasks', () => {
  const html = renderToStaticMarkup(
    <SessionMapCommanderPanel
      harnessRuns={[runningRun]}
      briefingOpen={false}
      onOpenBriefing={() => undefined}
      buttonRef={createRef()}
    />
  );

  assert.match(html, /data-commander-progress="true"/);
});

test('commander panel stays in standby language when only non-commander runs are active', () => {
  const html = renderToStaticMarkup(
    <SessionMapCommanderPanel
      harnessRuns={[nonCommanderRunningRun]}
      briefingOpen={false}
      onOpenBriefing={() => undefined}
      buttonRef={createRef()}
    />
  );

  assert.match(html, /Awaiting command/);
  assert.match(html, /Standby/);
});

test('commander briefing panel renders a Session Map scoped briefing region when open', () => {
  const html = renderToStaticMarkup(
    <SessionMapCommanderBriefingPanel
      open={true}
      focusData={focusData}
      harnessRuns={[runningRun]}
      sessionError=""
      onCancelHarnessRun={async () => null}
      onResumeHarnessRun={async () => null}
      onClearSessionError={() => undefined}
      onClose={() => undefined}
    />
  );

  assert.match(html, /data-commander-briefing="true"/);
  assert.match(html, /Commander Briefing/);
  assert.match(html, /Session Map Scope/);
});

test('commander briefing panel returns no markup when closed', () => {
  const html = renderToStaticMarkup(
    <SessionMapCommanderBriefingPanel
      open={false}
      focusData={focusData}
      harnessRuns={[runningRun]}
      sessionError=""
      onCancelHarnessRun={async () => null}
      onResumeHarnessRun={async () => null}
      onClearSessionError={() => undefined}
      onClose={() => undefined}
    />
  );

  assert.equal(html, '');
});
