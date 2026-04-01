const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { readTextFile, writeTextFile } = require('../workbench');

async function createGitRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-workbench-root-'));
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function writeFixture(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

test('readTextFile rejects symlink targets that resolve outside the repository root', async (t) => {
  const rootDir = await createGitRoot();
  const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-workbench-external-'));

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(externalDir, { recursive: true, force: true });
  });

  const externalFile = path.join(externalDir, 'outside.md');
  await writeFixture(externalFile, '# outside\n');
  await fs.symlink(externalFile, path.join(rootDir, 'outside-link.md'), 'file');

  await assert.rejects(
    () =>
      readTextFile({
        rootPath: rootDir,
        targetPath: 'outside-link.md',
      }),
    /outside repository root/i
  );
});

test('readTextFile rejects broken symbolic-link targets with a bounded error', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await fs.symlink(path.join(rootDir, 'missing.md'), path.join(rootDir, 'broken-link.md'), 'file');

  await assert.rejects(
    () =>
      readTextFile({
        rootPath: rootDir,
        targetPath: 'broken-link.md',
      }),
    /broken symbolic-link target/i
  );
});

test('writeTextFile rejects destinations whose parent resolves outside the repository root', async (t) => {
  const rootDir = await createGitRoot();
  const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-workbench-external-'));

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(externalDir, { recursive: true, force: true });
  });

  await fs.symlink(externalDir, path.join(rootDir, 'outside-dir'), 'dir');

  await assert.rejects(
    () =>
      writeTextFile({
        rootPath: rootDir,
        targetPath: 'outside-dir/new.md',
        content: 'should fail',
      }),
    /outside repository root/i
  );
});
