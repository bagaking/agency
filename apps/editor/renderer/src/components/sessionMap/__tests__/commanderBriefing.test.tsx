import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { SessionMapOperationsRail } from '../SessionMapOperationsRail';
import { SessionMapCommanderBriefingPanel } from '../SessionMapCommanderBriefingPanel';
import { SessionMapRightStation } from '../SessionMapRightStation';

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

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    SVGElement: globalThis.SVGElement,
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    ResizeObserver: (globalThis as any).ResizeObserver,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
  });
  const requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  const cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
  dom.window.requestAnimationFrame = requestAnimationFrame;
  dom.window.cancelAnimationFrame = cancelAnimationFrame;
  (globalThis as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  if (!(dom.window.HTMLElement.prototype as any).attachEvent) {
    (dom.window.HTMLElement.prototype as any).attachEvent = () => undefined;
  }
  if (!(dom.window.HTMLElement.prototype as any).detachEvent) {
    (dom.window.HTMLElement.prototype as any).detachEvent = () => undefined;
  }
  return {
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        SVGElement: previous.SVGElement,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
      });
      globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
      (globalThis as any).ResizeObserver = previous.ResizeObserver;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

test('ops rail exposes an integrated commander briefing affordance', () => {
  const html = renderToStaticMarkup(
    <SessionMapOperationsRail
      focusData={focusData}
      attentionItems={[]}
      harnessRuns={[runningRun]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
      onOpenCommanderBriefing={() => undefined}
    />
  );

  assert.match(html, /data-commander-trigger="true"/);
  assert.match(html, /Commander/);
  assert.match(html, /CODEX CLI/);
  assert.match(html, /aria-expanded="false"/);
});

test('ops rail shows a progress bar for active commander tasks', () => {
  const html = renderToStaticMarkup(
    <SessionMapOperationsRail
      focusData={focusData}
      attentionItems={[]}
      harnessRuns={[runningRun]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
      onOpenCommanderBriefing={() => undefined}
    />
  );

  assert.match(html, /data-commander-progress="true"/);
});

test('ops rail keeps commander quiet when only non-commander runs are active', () => {
  const html = renderToStaticMarkup(
    <SessionMapOperationsRail
      focusData={focusData}
      attentionItems={[]}
      harnessRuns={[nonCommanderRunningRun]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
      onOpenCommanderBriefing={() => undefined}
    />
  );

  assert.doesNotMatch(html, /data-commander-progress="true"/);
  assert.match(html, /STANDBY/);
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

test('right station switches between ops mode and briefing mode in one host column', () => {
  const closedHtml = renderToStaticMarkup(
    <SessionMapRightStation
      focusData={focusData}
      attentionItems={[]}
      harnessRuns={[runningRun]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
      commanderBriefingOpen={false}
      onOpenCommanderBriefing={() => undefined}
      onCloseCommanderBriefing={() => undefined}
    />
  );

  const openHtml = renderToStaticMarkup(
    <SessionMapRightStation
      focusData={focusData}
      attentionItems={[]}
      harnessRuns={[runningRun]}
      sessionError=""
      onClearSessionError={() => undefined}
      onCancelHarnessRun={() => undefined}
      onResumeHarnessRun={() => undefined}
      onSelectAttention={() => undefined}
      commanderBriefingOpen={true}
      onOpenCommanderBriefing={() => undefined}
      onCloseCommanderBriefing={() => undefined}
    />
  );

  assert.match(closedHtml, /data-commander-trigger="true"/);
  assert.doesNotMatch(closedHtml, /data-commander-briefing="true"/);
  assert.match(openHtml, /data-commander-briefing="true"/);
  assert.match(openHtml, /hidden=""/);
});

test('right station preserves ops evidence state across briefing mode toggles', async () => {
  const env = setupDom();
  try {
    function Harness() {
      const [briefingOpen, setBriefingOpen] = React.useState(false);
      return (
        <SessionMapRightStation
          focusData={focusData}
          attentionItems={[]}
          harnessRuns={[runningRun]}
          sessionError=""
          onClearSessionError={() => undefined}
          onCancelHarnessRun={() => undefined}
          onResumeHarnessRun={() => undefined}
          onSelectAttention={() => undefined}
          commanderBriefingOpen={briefingOpen}
          onOpenCommanderBriefing={() => setBriefingOpen(true)}
          onCloseCommanderBriefing={() => setBriefingOpen(false)}
        />
      );
    }

    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(<Harness />);
    });

    const collapseButton = Array.from(document.querySelectorAll('button')).find((node) =>
      /collapse/i.test(node.textContent || '')
    ) as HTMLButtonElement | undefined;
    assert.ok(collapseButton);

    await act(async () => {
      collapseButton.click();
    });

    assert.ok(document.body.textContent?.includes('Show Evidence'));

    const commanderTrigger = document.querySelector(
      '[data-commander-trigger="true"]'
    ) as HTMLButtonElement | null;
    assert.ok(commanderTrigger);

    await act(async () => {
      commanderTrigger.click();
    });

    assert.ok(document.querySelector('[data-commander-briefing="true"]'));
    assert.equal(
      (document.activeElement as HTMLTextAreaElement | null)?.getAttribute('placeholder'),
      'Ask the commander about the current session or run'
    );

    const closeButton = document.querySelector(
      '[aria-label="Close commander briefing"]'
    ) as HTMLButtonElement | null;
    assert.ok(closeButton);

    await act(async () => {
      closeButton.click();
    });

    assert.ok(document.body.textContent?.includes('Show Evidence'));
    assert.equal(
      document.querySelector('[data-commander-trigger="true"]')?.getAttribute('aria-expanded'),
      'false'
    );

    const reopenedTrigger = document.querySelector(
      '[data-commander-trigger="true"]'
    ) as HTMLButtonElement | null;
    assert.ok(reopenedTrigger);

    await act(async () => {
      reopenedTrigger.click();
    });

    assert.equal(
      (document.activeElement as HTMLTextAreaElement | null)?.getAttribute('placeholder'),
      'Ask the commander about the current session or run'
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
