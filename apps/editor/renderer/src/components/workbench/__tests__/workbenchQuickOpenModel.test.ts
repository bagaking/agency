import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWorkbenchQuickOpenSections,
  parseWorkbenchQuickOpenQuery,
} from '../workbenchQuickOpenModel';

test('buildWorkbenchQuickOpenSections shows open tabs before project files and dedupes paths', () => {
  const sections = buildWorkbenchQuickOpenSections({
    query: 'config',
    activeTabId: 'tab-1',
    openTabs: [
      { id: 'tab-1', path: 'apps/editor/config.toml', title: 'config.toml', isPreview: false },
      { id: 'tab-2', path: 'docs/config-guide.md', title: 'config-guide.md', isPreview: true },
    ],
    fileMatches: [
      'apps/editor/config.toml',
      'docs/config-guide.md',
      'pkg/config/index.ts',
    ],
  });

  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.id, 'open-tabs');
  assert.equal(sections[1]?.id, 'project-files');
  assert.deepEqual(
    sections[0]?.items.map((item) => item.path),
    ['apps/editor/config.toml', 'docs/config-guide.md']
  );
  assert.deepEqual(sections[1]?.items.map((item) => item.path), ['pkg/config/index.ts']);
  assert.equal(sections[0]?.items[0]?.isActive, true);
});

test('buildWorkbenchQuickOpenSections uses open tabs as immediate targets for empty query', () => {
  const sections = buildWorkbenchQuickOpenSections({
    query: '',
    activeTabId: 'tab-2',
    openTabs: [
      { id: 'tab-1', path: 'README.md', title: 'README.md', isPreview: true },
      { id: 'tab-2', path: 'apps/editor/package.json', title: 'package.json', isPreview: false },
    ],
    fileMatches: [],
  });

  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.id, 'open-tabs');
  assert.equal(sections[0]?.items[1]?.isActive, true);
});

test('parseWorkbenchQuickOpenQuery keeps path and line/column targets separate', () => {
  assert.deepEqual(parseWorkbenchQuickOpenQuery('apps/editor/config.toml:42:7'), {
    raw: 'apps/editor/config.toml:42:7',
    pathQuery: 'apps/editor/config.toml',
    line: 42,
    column: 7,
    hasLocation: true,
  });

  assert.deepEqual(parseWorkbenchQuickOpenQuery(':12'), {
    raw: ':12',
    pathQuery: '',
    line: 12,
    column: null,
    hasLocation: true,
  });
});

test('buildWorkbenchQuickOpenSections propagates parsed line and column to both tab and file targets', () => {
  const sections = buildWorkbenchQuickOpenSections({
    query: 'config.toml:12:4',
    activeTabId: 'tab-1',
    openTabs: [
      { id: 'tab-1', path: 'apps/editor/config.toml', title: 'config.toml', isPreview: false },
    ],
    fileMatches: ['apps/editor/config.toml', 'docs/config-guide.md'],
  });

  assert.equal(sections[0]?.items[0]?.line, 12);
  assert.equal(sections[0]?.items[0]?.column, 4);
  assert.equal(sections[1]?.items[0]?.line, 12);
  assert.equal(sections[1]?.items[0]?.column, 4);
});
