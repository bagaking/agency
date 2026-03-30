const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const explorerPolicyModulePath = require.resolve('../explorerPolicy.ts');
const projectRootModulePath = require.resolve('../projectRoot.ts');
const uiStateModulePath = require.resolve('../uiState.ts');

async function createGitRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-policy-'));
  execFileSync('git', ['init', '-q'], { cwd: rootDir });
  return rootDir;
}

async function withExplorerPolicyService(run) {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-explorer-policy-ui-'));
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

  delete require.cache[explorerPolicyModulePath];
  delete require.cache[projectRootModulePath];
  delete require.cache[uiStateModulePath];
  const explorerPolicy = require(explorerPolicyModulePath);

  try {
    await run(explorerPolicy);
  } finally {
    delete process.env.AGENCY_TEST_MODE;
    delete process.env.AGENCY_TEST_PROJECT_ROOT;
    delete require.cache[explorerPolicyModulePath];
    delete require.cache[projectRootModulePath];
    delete require.cache[uiStateModulePath];
    Module._load = originalLoad;
    await fs.rm(userDataPath, { recursive: true, force: true });
  }
}

test('readExplorerProjectPolicy loads and normalizes .agency/explorer.yaml defaults', async (t) => {
  await withExplorerPolicyService(async ({ readExplorerProjectPolicy }) => {
    const rootDir = await createGitRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await fs.mkdir(path.join(rootDir, '.agency'), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, '.agency', 'explorer.yaml'),
      [
        'filters:',
        '  visibility.hidden: false',
        '  status:',
        '    - modified',
        'workingSet:',
        '  defaultView: changed-files',
        '  presets:',
        '    - changed-files',
        'search:',
        '  defaultMode: content',
        '  content:',
        '    defaultScope: selection',
        '    wholeWord: true',
        'actions:',
        '  hiddenCommands:',
        '    - explorer.refresh',
        'research:',
        '  allowMarkdownSave: false',
        '',
      ].join('\n'),
      'utf8'
    );

    process.env.AGENCY_TEST_MODE = '1';
    process.env.AGENCY_TEST_PROJECT_ROOT = rootDir;

    const result = await readExplorerProjectPolicy({ rootPath: rootDir });

    assert.equal(await fs.realpath(result.projectRoot), await fs.realpath(rootDir));
    assert.match(result.sourcePath, /\.agency\/explorer\.yaml$/);
    assert.equal(result.policy.filters['visibility.hidden'], false);
    assert.deepEqual(result.policy.filters.status, ['modified']);
    assert.equal(result.policy.workingSet.defaultView, 'changed-files');
    assert.deepEqual(result.policy.workingSet.presets, ['changed-files']);
    assert.equal(result.policy.search.defaultMode, 'content');
    assert.equal(result.policy.search.content.defaultScope, 'selection');
    assert.equal(result.policy.search.content.wholeWord, true);
    assert.deepEqual(result.policy.actions.hiddenCommands, ['explorer.refresh']);
    assert.equal(result.policy.research.allowMarkdownSave, false);
    assert.equal(result.policy.research.enabled, true);
  });
});

export {};
