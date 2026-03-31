import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorkbenchQuickOpenSections } from '../workbenchQuickOpenModel';

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
