const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const workbenchPolicyModulePath = require.resolve('../workbenchPolicy.ts');
const projectRootModulePath = require.resolve('../projectRoot.ts');
const uiStateModulePath = require.resolve('../uiState.ts');

async function createGitRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-workbench-policy-'));
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function withWorkbenchPolicyService(run) {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-workbench-policy-ui-'));
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: {
          getPath(name) {
            if (name === 'userData') {
              return userDataPath;
            }
            return os.tmpdir();
          },
        },
        dialog: {},
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[workbenchPolicyModulePath];
  delete require.cache[projectRootModulePath];
  delete require.cache[uiStateModulePath];
  const workbenchPolicy = require(workbenchPolicyModulePath);

  try {
    await run(workbenchPolicy);
  } finally {
    delete process.env.AGENCY_TEST_MODE;
    delete process.env.AGENCY_TEST_PROJECT_ROOT;
    delete require.cache[workbenchPolicyModulePath];
    delete require.cache[projectRootModulePath];
    delete require.cache[uiStateModulePath];
    Module._load = originalLoad;
    await fs.rm(userDataPath, { recursive: true, force: true });
  }
}

test('readWorkbenchProjectPolicy loads and normalizes .agency/workbench.yaml rules', async (t) => {
  await withWorkbenchPolicyService(async ({ readWorkbenchProjectPolicy }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await fs.mkdir(path.join(rootDir, '.agency'), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, '.agency', 'workbench.yaml'),
      [
        'languages:',
        '  overrides:',
        '    - match: "**/*.env.local"',
        '      language: dotenv',
        '    - match: "Tiltfile"',
        '      language: py',
        '    - match: ""',
        '      language: shell',
        '    - match: "*.foo"',
        '      language: not-real',
        '',
      ].join('\n'),
      'utf8'
    );

    process.env.AGENCY_TEST_MODE = '1';
    process.env.AGENCY_TEST_PROJECT_ROOT = rootDir;

    const result = await readWorkbenchProjectPolicy({ rootPath: rootDir });

    assert.equal(await fs.realpath(result.projectRoot), await fs.realpath(rootDir));
    assert.match(result.sourcePath, /\.agency\/workbench\.yaml$/);
    assert.deepEqual(result.policy.languages.overrides, [
      { match: '**/*.env.local', language: 'dotenv' },
      { match: 'Tiltfile', language: 'python' },
    ]);
    assert.deepEqual(result.warnings, ['Ignored invalid or unsupported workbench language rules.']);
  });
});

export {};
