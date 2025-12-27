const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

function getStatePath() {
  return path.join(app.getPath('userData'), 'editor-ui-state.json');
}

async function readUiState() {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    return {};
  }
  const raw = await fsp.readFile(statePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

async function writeUiState(nextState) {
  const statePath = getStatePath();
  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  await fsp.writeFile(statePath, JSON.stringify(nextState, null, 2), 'utf-8');
  return nextState;
}

async function updateUiState(partial) {
  const current = await readUiState();
  const next = { ...current, ...partial };
  return writeUiState(next);
}

module.exports = {
  readUiState,
  updateUiState,
};
