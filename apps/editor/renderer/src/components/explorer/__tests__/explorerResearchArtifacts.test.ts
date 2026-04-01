import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExplorerResearchMarkdown,
  parseExplorerResearchFrontmatter,
} from '../explorerResearchArtifacts';

test('buildExplorerResearchMarkdown stores source url in fixed frontmatter', () => {
  const markdown = buildExplorerResearchMarkdown(
    {
      url: 'https://example.com/research',
      title: 'Example Research',
      siteName: 'Example Docs',
      fetchedAt: '2026-03-31T00:00:00.000Z',
      summary: 'Summary',
      text: 'Reader text.',
    },
    {
      note: 'Keep this note.',
      sourceSurface: 'workbench-bounded-web-research',
    }
  );

  assert.match(markdown, /^---\nagency_source_url: "https:\/\/example\.com\/research"/);
  assert.match(markdown, /agency_source_title: "Example Research"/);
  assert.match(markdown, /agency_source_surface: "workbench-bounded-web-research"/);

  const parsed = parseExplorerResearchFrontmatter(markdown);
  assert.deepEqual(parsed, {
    url: 'https://example.com/research',
    title: 'Example Research',
    siteName: 'Example Docs',
    fetchedAt: '2026-03-31T00:00:00.000Z',
    sourceSurface: 'workbench-bounded-web-research',
  });
});
