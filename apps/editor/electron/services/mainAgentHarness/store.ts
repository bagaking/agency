// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');

const fsp = fs.promises;

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function getElectronApp() {
  try {
    const electron = require('electron');
    if (
      electron &&
      typeof electron === 'object' &&
      electron.app &&
      typeof electron.app.getPath === 'function'
    ) {
      return electron.app;
    }
  } catch (_error) {
    // ignore
  }
  return null;
}

function getFallbackUserDataPath() {
  const explicit = String(process.env.AGENCY_USER_DATA_PATH || '').trim();
  if (explicit) {
    return explicit;
  }
  const homePath = os.homedir() || process.cwd();
  if (process.platform === 'darwin') {
    return path.join(homePath, 'Library', 'Application Support', 'Agency');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(homePath, 'AppData', 'Roaming'), 'Agency');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(homePath, '.config'), 'Agency');
}

function getHarnessRunsDir() {
  const electronApp = getElectronApp();
  const userDataPath = electronApp ? electronApp.getPath('userData') : getFallbackUserDataPath();
  return path.join(userDataPath, 'main-agent-harness', 'runs');
}

function getRunPath(runId) {
  const normalizedRunId = String(runId || '').trim();
  if (!normalizedRunId) {
    throw new Error('runId is required.');
  }
  return path.join(getHarnessRunsDir(), `${normalizedRunId}.json`);
}

async function readJsonFile(filePath, { allowMalformed = false } = {}) {
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (allowMalformed && error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, payload) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = JSON.stringify(payload, null, 2);
  const tempPath = `${filePath}.tmp`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  try {
    await fsp.rename(tempPath, filePath);
  } catch (_error) {
    await fsp.unlink(filePath).catch(() => undefined);
    await fsp.rename(tempPath, filePath);
  }
}

function createMemoryHarnessRunStore() {
  const runs = new Map();
  const updateQueues = new Map();

  function queue(runId, task) {
    const key = String(runId || '').trim();
    const previous = updateQueues.get(key) || Promise.resolve();
    const next = previous.then(task, task);
    updateQueues.set(
      key,
      next.finally(() => {
        if (updateQueues.get(key) === next) {
          updateQueues.delete(key);
        }
      })
    );
    return next;
  }

  return {
    async create(run) {
      const key = String(run?.runId || '').trim();
      if (!key) {
        throw new Error('run.runId is required.');
      }
      const next = cloneValue(run);
      runs.set(key, next);
      return cloneValue(next);
    },
    async read(runId) {
      const key = String(runId || '').trim();
      if (!key || !runs.has(key)) {
        return null;
      }
      return cloneValue(runs.get(key));
    },
    async update(runId, updater) {
      const key = String(runId || '').trim();
      if (!key) {
        throw new Error('runId is required.');
      }
      return queue(key, async () => {
        const current = runs.has(key) ? cloneValue(runs.get(key)) : null;
        if (!current) {
          throw new Error(`Harness run not found: ${key}`);
        }
        const mutated = (await updater(current)) || current;
        const next = cloneValue(mutated);
        runs.set(key, next);
        return cloneValue(next);
      });
    },
    async list({ limit = 50 } = {}) {
      return Array.from(runs.values())
        .sort((left, right) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')))
        .slice(0, Math.max(1, Number(limit) || 50))
        .map((item) => cloneValue(item));
    },
  };
}

function createFileHarnessRunStore() {
  const updateQueues = new Map();

  function queue(runId, task) {
    const key = String(runId || '').trim();
    const previous = updateQueues.get(key) || Promise.resolve();
    const next = previous.then(task, task);
    updateQueues.set(
      key,
      next.finally(() => {
        if (updateQueues.get(key) === next) {
          updateQueues.delete(key);
        }
      })
    );
    return next;
  }

  return {
    async create(run) {
      const key = String(run?.runId || '').trim();
      if (!key) {
        throw new Error('run.runId is required.');
      }
      const payload = cloneValue(run);
      await writeJsonAtomic(getRunPath(key), payload);
      return cloneValue(payload);
    },
    async read(runId) {
      const key = String(runId || '').trim();
      if (!key) {
        return null;
      }
      const filePath = getRunPath(key);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const parsed = await readJsonFile(filePath, { allowMalformed: true });
      return parsed ? cloneValue(parsed) : null;
    },
    async update(runId, updater) {
      const key = String(runId || '').trim();
      if (!key) {
        throw new Error('runId is required.');
      }
      return queue(key, async () => {
        const current = await this.read(key);
        if (!current) {
          throw new Error(`Harness run not found: ${key}`);
        }
        const mutated = (await updater(current)) || current;
        const next = cloneValue(mutated);
        await writeJsonAtomic(getRunPath(key), next);
        return cloneValue(next);
      });
    },
    async list({ limit = 50 } = {}) {
      const runsDir = getHarnessRunsDir();
      if (!fs.existsSync(runsDir)) {
        return [];
      }
      const entries = await fsp.readdir(runsDir);
      const files = entries.filter((entry) => entry.endsWith('.json'));
      const runs = [];
      for (const fileName of files) {
        const parsed = await readJsonFile(path.join(runsDir, fileName), { allowMalformed: true });
        if (parsed) {
          runs.push(parsed);
        }
      }
      return runs
        .sort((left, right) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')))
        .slice(0, Math.max(1, Number(limit) || 50))
        .map((item) => cloneValue(item));
    },
  };
}

module.exports = {
  createMemoryHarnessRunStore,
  createFileHarnessRunStore,
};
