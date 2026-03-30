import assert from 'node:assert/strict';
import test from 'node:test';

import { configureWorkbenchMonaco } from '../workbenchMonaco';

test('configureWorkbenchMonaco registers missing workbench languages once', () => {
  const registered: string[] = [];
  const tokenProviders = new Map<string, unknown>();
  const configurations = new Map<string, unknown>();

  const monaco = {
    languages: {
      getLanguages: () => registered.map((id) => ({ id })),
      register: ({ id }: { id: string }) => {
        registered.push(id);
      },
      setMonarchTokensProvider: (id: string, provider: unknown) => {
        tokenProviders.set(id, provider);
      },
      setLanguageConfiguration: (id: string, configuration: unknown) => {
        configurations.set(id, configuration);
      },
    },
  };

  configureWorkbenchMonaco(monaco);
  configureWorkbenchMonaco(monaco);

  assert.deepEqual(registered, ['toml', 'makefile', 'gitignore', 'dotenv']);
  assert.equal(tokenProviders.size, 4);
  assert.equal(configurations.size, 4);
});
