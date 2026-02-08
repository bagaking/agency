const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { importEntries } = require('../explorer');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createGitRoot() {
  const rootDir = await createTempDir('agency-explorer-root-');
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

test('importEntries resolves name conflicts with numeric suffix while preserving extension', async (t) => {
  const rootDir = await createGitRoot();
  const sourceDir = await createTempDir('agency-explorer-source-');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  });

  await writeTextFile(path.join(rootDir, 'report.md'), 'existing report');

  const sourceFile = path.join(sourceDir, 'report.md');
  await writeTextFile(sourceFile, 'incoming report');

  const result = await importEntries({
    rootPath: rootDir,
    targetDir: '',
    sourcePaths: [sourceFile],
  });

  assert.equal(result.imported.length, 1);
  assert.equal(result.imported[0].targetPath, 'report (1).md');
  assert.equal(result.resolvedConflicts.length, 1);

  const existingContent = await fs.readFile(path.join(rootDir, 'report.md'), 'utf8');
  const importedContent = await fs.readFile(path.join(rootDir, 'report (1).md'), 'utf8');

  assert.equal(existingContent, 'existing report');
  assert.equal(importedContent, 'incoming report');
});

test('importEntries reports partial failures without aborting successful imports', async (t) => {
  const rootDir = await createGitRoot();
  const sourceDir = await createTempDir('agency-explorer-source-');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  });

  const validSource = path.join(sourceDir, 'ok.txt');
  const missingSource = path.join(sourceDir, 'missing.txt');
  await writeTextFile(validSource, 'valid payload');

  const result = await importEntries({
    rootPath: rootDir,
    targetDir: '',
    sourcePaths: [missingSource, validSource],
  });

  assert.equal(result.imported.length, 1);
  assert.equal(result.imported[0].targetPath, 'ok.txt');
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].sourcePath, path.resolve(missingSource));

  const importedContent = await fs.readFile(path.join(rootDir, 'ok.txt'), 'utf8');
  assert.equal(importedContent, 'valid payload');
});

test('importEntries copies directories recursively into the target directory', async (t) => {
  const rootDir = await createGitRoot();
  const sourceDir = await createTempDir('agency-explorer-source-');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  });

  const sourceFolder = path.join(sourceDir, 'cards');
  await writeTextFile(path.join(sourceFolder, 'drafts', 'contract.md'), '# draft');
  await writeTextFile(path.join(sourceFolder, 'notes.md'), 'note body');

  const result = await importEntries({
    rootPath: rootDir,
    targetDir: '',
    sourcePaths: [sourceFolder],
  });

  assert.equal(result.imported.length, 1);
  assert.equal(result.imported[0].targetPath, 'cards');

  const nestedFile = await fs.readFile(path.join(rootDir, 'cards', 'drafts', 'contract.md'), 'utf8');
  const siblingFile = await fs.readFile(path.join(rootDir, 'cards', 'notes.md'), 'utf8');

  assert.equal(nestedFile, '# draft');
  assert.equal(siblingFile, 'note body');
});

export {};
