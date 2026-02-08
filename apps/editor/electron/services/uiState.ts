// @ts-nocheck
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;
let stateCache = null;
let stateLoaded = false;
let updateQueue = Promise.resolve();

function queueUpdate(task) {
  updateQueue = updateQueue.then(task, task);
  return updateQueue;
}

function getStatePath() {
  return path.join(app.getPath('userData'), 'editor-ui-state.json');
}

async function readUiState() {
  if (stateLoaded) {
    return stateCache || {};
  }
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    stateLoaded = true;
    stateCache = {};
    return {};
  }
  const raw = await fsp.readFile(statePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    stateCache = parsed && typeof parsed === 'object' ? parsed : {};
    stateLoaded = true;
    return stateCache;
  } catch (error) {
    stateLoaded = true;
    stateCache = {};
    return {};
  }
}

async function writeUiState(nextState) {
  const statePath = getStatePath();
  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  const payload = JSON.stringify(nextState, null, 2);
  const tmpPath = `${statePath}.tmp`;
  await fsp.writeFile(tmpPath, payload, 'utf-8');
  try {
    await fsp.rename(tmpPath, statePath);
  } catch (error) {
    await fsp.unlink(statePath).catch(() => undefined);
    await fsp.rename(tmpPath, statePath);
  }
  stateCache = nextState;
  stateLoaded = true;
  return nextState;
}

async function updateUiState(partial) {
  return queueUpdate(async () => {
    const current = await readUiState();
    const next = { ...current, ...partial };
    return writeUiState(next);
  });
}

export {
  readUiState,
  updateUiState,
};
