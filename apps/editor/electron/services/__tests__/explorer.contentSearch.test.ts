const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const explorerModulePath = require.resolve('../explorer.ts');

async function createGitRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-search-'));
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function withExplorerService(run) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        shell: {
          showItemInFolder() {},
        },
        app: {
          getPath() {
            return os.tmpdir();
          },
        },
        dialog: {},
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[explorerModulePath];
  const explorer = require(explorerModulePath);

  try {
    await run(explorer);
  } finally {
    delete require.cache[explorerModulePath];
    Module._load = originalLoad;
  }
}

test('searchContent returns line-level evidence within the requested scope', async (t) => {
  await withExplorerService(async ({ searchContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await writeTextFile(
      path.join(rootDir, 'docs', 'guide.md'),
      'Agency explorer capability platform\ncontent search should stay reviewable\n'
    );
    await writeTextFile(path.join(rootDir, 'notes.txt'), 'content search appears twice\ncontent search\n');

    const result = await searchContent({
      rootPath: rootDir,
      query: 'content search',
      scope: { kind: 'folder', path: 'docs' },
    });

    assert.equal(result.scope.kind, 'folder');
    assert.equal(result.results.length, 1);
    assert.equal(result.totalResultFiles, 1);
    assert.equal(result.totalResultMatches, 1);
    assert.equal(result.results[0].path, 'docs/guide.md');
    assert.equal(result.results[0].matches[0].line, 2);
    assert.match(result.results[0].matches[0].snippet, /content search/);
  });
});

test('listDirectory keeps symbolic-link directories typed as directories', async (t) => {
  await withExplorerService(async ({ listDirectory }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const sourceDir = path.join(rootDir, 'linked-source');
    const linkDir = path.join(rootDir, 'docs-link');
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.symlink(sourceDir, linkDir, 'dir');

    const result = await listDirectory({
      rootPath: rootDir,
      relativePath: '',
      showHidden: true,
    });

    const entry = result.entries.find((item) => item.path === 'docs-link');
    assert.ok(entry);
    assert.equal(entry.type, 'dir');
    assert.equal(entry.isSymbolicLink, true);
    assert.equal(entry.symlinkBoundaryState, 'inside-root');
  });
});

test('searchFiles preserves symbolic-link metadata for path search results', async (t) => {
  await withExplorerService(async ({ searchFiles }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const sourcePath = path.join(rootDir, 'guide.md');
    const linkPath = path.join(rootDir, 'guide-link.md');
    await writeTextFile(sourcePath, '# guide\n');
    await fs.symlink(sourcePath, linkPath, 'file');

    const result = await searchFiles({
      rootPath: rootDir,
      query: 'guide-link',
    });

    assert.equal(result.truncated, false);
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0]?.path, 'guide-link.md');
    assert.equal(result.matches[0]?.type, 'file');
    assert.equal(result.matches[0]?.isSymbolicLink, true);
    assert.equal(result.matches[0]?.symlinkBoundaryState, 'inside-root');
  });
});

test('listDirectory keeps outside-root symlink directories visible but non-traversable', async (t) => {
  await withExplorerService(async ({ listDirectory }) => {
    const rootDir = await createGitRoot();
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-external-'));
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
      await fs.rm(externalDir, { recursive: true, force: true });
    });

    await fs.symlink(externalDir, path.join(rootDir, 'outside-dir'), 'dir');

    const result = await listDirectory({
      rootPath: rootDir,
      relativePath: '',
      showHidden: true,
    });

    const entry = result.entries.find((item) => item.path === 'outside-dir');
    assert.ok(entry);
    assert.equal(entry.type, 'dir');
    assert.equal(entry.isSymbolicLink, true);
    assert.equal(entry.symlinkBoundaryState, 'outside-root');
    assert.equal(entry.isTraversalRestricted, true);

    await assert.rejects(
      () =>
        listDirectory({
          rootPath: rootDir,
          relativePath: 'outside-dir',
          showHidden: true,
        }),
      /outside repository root/i
    );
  });
});

test('listDirectory marks symlink cycles as non-traversable', async (t) => {
  await withExplorerService(async ({ listDirectory }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await fs.symlink(rootDir, path.join(rootDir, 'loop'), 'dir');

    const result = await listDirectory({
      rootPath: rootDir,
      relativePath: '',
      showHidden: true,
    });

    const entry = result.entries.find((item) => item.path === 'loop');
    assert.ok(entry);
    assert.equal(entry.type, 'dir');
    assert.equal(entry.isSymbolicLink, true);
    assert.equal(entry.symlinkBoundaryState, 'cycle');
    assert.equal(entry.isTraversalRestricted, true);

    await assert.rejects(
      () =>
        listDirectory({
          rootPath: rootDir,
          relativePath: 'loop',
          showHidden: true,
        }),
      /symbolic-link cycle/i
    );
  });
});

test('searchContent rejects folder scope without a concrete directory context', async (t) => {
  await withExplorerService(async ({ searchContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await assert.rejects(
      () =>
        searchContent({
          rootPath: rootDir,
          query: 'content search',
          scope: { kind: 'folder', path: '' },
        }),
      /Folder content scope requires a directory context/
    );
  });
});

test('searchContent skips symlink targets that resolve outside the repository root', async (t) => {
  await withExplorerService(async ({ searchContent }) => {
    const rootDir = await createGitRoot();
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-external-'));
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
      await fs.rm(externalDir, { recursive: true, force: true });
    });

    const externalFile = path.join(externalDir, 'outside.md');
    await writeTextFile(externalFile, 'content search outside\n');
    await fs.symlink(externalFile, path.join(rootDir, 'outside-link.md'), 'file');

    const result = await searchContent({
      rootPath: rootDir,
      query: 'content search',
      scope: { kind: 'project' },
    });

    assert.equal(result.results.length, 0);
    assert.equal(result.skippedRestrictedCount, 1);
  });
});

test('searchContent skips broken symbolic-link targets instead of crashing the search', async (t) => {
  await withExplorerService(async ({ searchContent, readEntry }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await fs.symlink(path.join(rootDir, 'missing.md'), path.join(rootDir, 'broken-link.md'), 'file');

    const result = await searchContent({
      rootPath: rootDir,
      query: 'content search',
      scope: { kind: 'project' },
    });

    assert.equal(result.results.length, 0);
    assert.equal(result.skippedRestrictedCount, 1);

    await assert.rejects(
      () =>
        readEntry({
          rootPath: rootDir,
          targetPath: 'broken-link.md',
        }),
      /broken symbolic-link target/i
    );
  });
});

test('replaceContent only mutates confirmed targets and reports counts', async (t) => {
  await withExplorerService(async ({ replaceContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const docsPath = path.join(rootDir, 'docs', 'guide.md');
    const notesPath = path.join(rootDir, 'notes.txt');
    await writeTextFile(docsPath, 'content search one\ncontent search two\n');
    await writeTextFile(notesPath, 'content search should stay here\n');

    const result = await replaceContent({
      rootPath: rootDir,
      query: 'content search',
      replacement: 'workspace search',
      scope: { kind: 'project' },
      confirmedPaths: ['docs/guide.md'],
    });

    assert.equal(result.replacedFiles, 1);
    assert.equal(result.replacedMatches, 2);
    assert.equal(result.reviewMode, 'file');
    assert.deepEqual(result.appliedPaths, ['docs/guide.md']);
    assert.match(await fs.readFile(docsPath, 'utf8'), /workspace search one/);
    assert.match(await fs.readFile(notesPath, 'utf8'), /content search should stay here/);
  });
});

test('createEntry rejects destinations whose parent resolves outside the repository root', async (t) => {
  await withExplorerService(async ({ createEntry }) => {
    const rootDir = await createGitRoot();
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-external-'));
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
      await fs.rm(externalDir, { recursive: true, force: true });
    });

    await fs.symlink(externalDir, path.join(rootDir, 'outside-dir'), 'dir');

    await assert.rejects(
      () =>
        createEntry({
          rootPath: rootDir,
          parentPath: 'outside-dir',
          name: 'new.md',
          type: 'file',
        }),
      /outside repository root/i
    );
  });
});

test('renameEntry rejects destinations whose parent resolves outside the repository root', async (t) => {
  await withExplorerService(async ({ renameEntry }) => {
    const rootDir = await createGitRoot();
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-external-'));
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
      await fs.rm(externalDir, { recursive: true, force: true });
    });

    await writeTextFile(path.join(rootDir, 'guide.md'), 'guide');
    await fs.symlink(externalDir, path.join(rootDir, 'outside-dir'), 'dir');

    await assert.rejects(
      () =>
        renameEntry({
          rootPath: rootDir,
          sourcePath: 'guide.md',
          targetPath: 'outside-dir/guide.md',
        }),
      /outside repository root/i
    );
  });
});

test('copyEntry rejects destinations whose parent resolves outside the repository root', async (t) => {
  await withExplorerService(async ({ copyEntry }) => {
    const rootDir = await createGitRoot();
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-external-'));
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
      await fs.rm(externalDir, { recursive: true, force: true });
    });

    await writeTextFile(path.join(rootDir, 'guide.md'), 'guide');
    await fs.symlink(externalDir, path.join(rootDir, 'outside-dir'), 'dir');

    await assert.rejects(
      () =>
        copyEntry({
          rootPath: rootDir,
          sourcePath: 'guide.md',
          targetPath: 'outside-dir/guide.md',
        }),
      /outside repository root/i
    );
  });
});

test('replaceContent can apply only explicitly confirmed matches', async (t) => {
  await withExplorerService(async ({ searchContent, replaceContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const docsPath = path.join(rootDir, 'docs', 'guide.md');
    await writeTextFile(docsPath, 'content search one\ncontent search two\n');

    const search = await searchContent({
      rootPath: rootDir,
      query: 'content search',
      scope: { kind: 'project' },
    });
    const docsMatch = search.results.find((entry) => entry.path === 'docs/guide.md')?.matches[0];
    assert.ok(docsMatch, 'expected at least one visible match');

    const result = await replaceContent({
      rootPath: rootDir,
      query: 'content search',
      replacement: 'workspace search',
      scope: { kind: 'project' },
      confirmedMatches: [
        {
          path: 'docs/guide.md',
          line: docsMatch.line,
          column: docsMatch.column,
          endColumn: docsMatch.endColumn,
          text: docsMatch.text,
        },
      ],
    });

    const nextContent = await fs.readFile(docsPath, 'utf8');
    assert.equal(result.reviewMode, 'match');
    assert.equal(result.replacedFiles, 1);
    assert.equal(result.replacedMatches, 1);
    assert.match(nextContent, /workspace search one/);
    assert.match(nextContent, /content search two/);
  });
});

test('replaceContent rejects confirmed matches that no longer satisfy the active query', async (t) => {
  await withExplorerService(async ({ replaceContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const docsPath = path.join(rootDir, 'docs', 'guide.md');
    await writeTextFile(docsPath, 'bar value one\nbar value two\n');

    const result = await replaceContent({
      rootPath: rootDir,
      query: 'foo',
      replacement: 'workspace',
      scope: { kind: 'project' },
      confirmedMatches: [
        {
          path: 'docs/guide.md',
          line: 1,
          column: 1,
          endColumn: 4,
          text: 'bar',
        },
      ],
    });

    assert.equal(result.replacedFiles, 0);
    assert.equal(result.replacedMatches, 0);
    assert.equal(result.skipped[0]?.reason, 'query-mismatch');
    assert.match(await fs.readFile(docsPath, 'utf8'), /bar value one/);
  });
});

test('replaceContent keeps full-file replace available when a file has more matches than the visible review list', async (t) => {
  await withExplorerService(async ({ searchContent, replaceContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    const filePath = path.join(rootDir, 'docs', 'many.txt');
    await writeTextFile(
      filePath,
      Array.from({ length: 30 }, (_value, index) => `content search ${index + 1}`).join('\n')
    );

    const search = await searchContent({
      rootPath: rootDir,
      query: 'content search',
      scope: { kind: 'project' },
    });

    const resultEntry = search.results.find((entry) => entry.path === 'docs/many.txt');
    assert.ok(resultEntry);
    assert.equal(resultEntry?.matchCount, 30);
    assert.equal(resultEntry?.matches.length, 24);

    const replace = await replaceContent({
      rootPath: rootDir,
      query: 'content search',
      replacement: 'workspace search',
      scope: { kind: 'project' },
      confirmedPaths: ['docs/many.txt'],
      confirmedMatches: resultEntry?.matches.map((match) => ({
        path: 'docs/many.txt',
        line: match.line,
        column: match.column,
        endColumn: match.endColumn,
        text: match.text,
      })),
    });

    assert.equal(replace.reviewMode, 'mixed');
    assert.equal(replace.replacedMatches, 30);
    const nextContent = await fs.readFile(filePath, 'utf8');
    assert.match(nextContent, /workspace search 30/);
    assert.doesNotMatch(nextContent, /content search 30/);
  });
});

test('replaceContent requires explicit confirmed review targets', async (t) => {
  await withExplorerService(async ({ replaceContent }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await writeTextFile(path.join(rootDir, 'docs', 'guide.md'), 'content search one\n');

    await assert.rejects(
      () =>
        replaceContent({
          rootPath: rootDir,
          query: 'content search',
          replacement: 'workspace search',
          scope: { kind: 'project' },
          confirmedPaths: [],
        }),
      /Content replace requires explicit confirmed target paths or matches/
    );
  });
});

export {};
