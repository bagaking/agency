const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { performFileIntent, performToolFileIntent, classifyAgentFiles } = require('../fileInteraction');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createGitRoot() {
  const rootDir = await createTempDir('agency-file-intent-root-');
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

test('performFileIntent open validates target existence and keeps normalized response shape', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await writeTextFile(path.join(rootDir, 'README.md'), 'hello');

  const success = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'README.md',
  });

  assert.equal(success.success, true);
  assert.equal(success.intent, 'open');
  assert.deepEqual(success.affectedPaths, ['README.md']);
  assert.equal(success.data?.path, 'README.md');

  const missing = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'missing.md',
  });

  assert.equal(missing.success, false);
  assert.equal(missing.failures[0]?.code, 'USER_ERROR');
  assert.equal(missing.failures[0]?.path, 'missing.md');
});

test('performFileIntent normalizes intent casing and whitespace', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await writeTextFile(path.join(rootDir, 'docs', 'notes.md'), 'hello');

  const result = await performFileIntent({
    intent: '  OPEN  ',
    rootPath: rootDir,
    targetPath: 'docs/notes.md',
  });

  assert.equal(result.success, true);
  assert.equal(result.intent, 'open');
  assert.deepEqual(result.affectedPaths, ['docs/notes.md']);
});

test('performFileIntent open rejects paths outside root', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  const result = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: '../outside.txt',
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0]?.code, 'USER_ERROR');
  assert.match(result.failures[0]?.message || '', /path escapes repository root/i);
});

test('performFileIntent keeps open/reveal semantics stable across surfaces', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await writeTextFile(path.join(rootDir, 'docs', 'guide.md'), 'guide');

  const explorerOpen = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'docs/guide.md',
    sourceSurface: 'explorer',
  });
  const memoOpen = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'docs/guide.md',
    sourceSurface: 'memo',
  });

  assert.equal(explorerOpen.success, true);
  assert.equal(memoOpen.success, true);
  assert.deepEqual(memoOpen.affectedPaths, explorerOpen.affectedPaths);

  const sessionMapOpen = await performFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'docs/guide.md',
    sourceSurface: 'session-map',
  });

  assert.equal(sessionMapOpen.success, true);
  assert.deepEqual(sessionMapOpen.affectedPaths, explorerOpen.affectedPaths);
});

test('performFileIntent import_copy surfaces partial-failure warnings without dropping successful imports', async (t) => {
  const rootDir = await createGitRoot();
  const sourceDir = await createTempDir('agency-file-intent-source-');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  });

  const validSource = path.join(sourceDir, 'ok.txt');
  const missingSource = path.join(sourceDir, 'missing.txt');
  await writeTextFile(validSource, 'payload');

  const result = await performFileIntent({
    intent: 'import_copy',
    rootPath: rootDir,
    sourcePaths: [missingSource, validSource],
    targetDir: '',
  });

  assert.equal(result.success, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, 'IMPORT_PARTIAL_FAILURE');
  assert.equal(result.data?.imported?.length, 1);
  assert.equal(result.data?.imported?.[0]?.targetPath, 'ok.txt');
  assert.equal(result.data?.failures?.length, 1);
});

test('performFileIntent import_copy keeps path-safety rules from explorer service', async (t) => {
  const rootDir = await createGitRoot();
  const sourceDir = await createTempDir('agency-file-intent-source-');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  });

  const validSource = path.join(sourceDir, 'ok.txt');
  await writeTextFile(validSource, 'payload');

  const result = await performFileIntent({
    intent: 'import_copy',
    rootPath: rootDir,
    sourcePaths: [validSource],
    targetDir: '../outside',
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0]?.code, 'USER_ERROR');
  assert.match(result.failures[0]?.message || '', /path escapes repository root/i);
});

test('classifyAgentFiles merges builtin and project semantic rules by priority', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await writeTextFile(
    path.join(rootDir, '.agency', 'agent-files.yaml'),
    ['rules:', '  - id: custom-agency', '    label: Agency Custom', '    priority: 450', '    matcherType: glob', '    matcherExpr: "**/Agency.md"', '  - id: custom-spark', '    label: Spark Custom', '    priority: 420', '    matcherType: glob', '    matcherExpr: "**/spark.md"'].join('\n')
  );

  const result = await classifyAgentFiles({
    rootPath: rootDir,
    paths: ['docs/Agency.md', 'docs/spark.md', '../outside.md'],
  });

  assert.equal(result.success, true);
  assert.equal(result.intent, 'classify');

  const agencyTags = result.data?.tagsByPath?.['docs/Agency.md'] || [];
  assert.equal(agencyTags[0]?.id, 'custom-agency');
  assert.equal(agencyTags.some((tag) => tag.id === 'agency-file'), true);

  const sparkTags = result.data?.tagsByPath?.['docs/spark.md'] || [];
  assert.equal(sparkTags[0]?.id, 'custom-spark');
  assert.equal(sparkTags.some((tag) => tag.id === 'spark-file'), true);

  const warningCodes = (result.warnings || []).map((warning) => warning.code);
  assert.equal(warningCodes.includes('INVALID_PATH'), true);
});

test('performToolFileIntent enforces capability checks and allows authorized read intents', async (t) => {
  const rootDir = await createGitRoot();

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  await writeTextFile(path.join(rootDir, 'notes.md'), 'hello');

  const denied = await performToolFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'notes.md',
    callerId: 'agent-1',
    traceId: 'trace-1',
    capabilities: ['file.write'],
  });

  assert.equal(denied.success, false);
  assert.equal(denied.failures[0]?.code, 'PERMISSION_DENIED');

  const allowed = await performToolFileIntent({
    intent: 'open',
    rootPath: rootDir,
    targetPath: 'notes.md',
    callerId: 'agent-1',
    traceId: 'trace-2',
    capabilities: ['file.read'],
  });

  assert.equal(allowed.success, true);
  assert.equal(allowed.data?.path, 'notes.md');
});

export {};
