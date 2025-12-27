const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fsp = fs.promises;

const DEFAULT_ACTIONS = [
  {
    id: 'codex',
    label: 'codex',
    startCommand: 'codex',
    resumeCommand: '',
  },
  {
    id: 'gemini',
    label: 'gemini',
    startCommand: 'gemini',
    resumeCommand: '',
  },
  {
    id: 'claude',
    label: 'claude',
    startCommand: 'claude',
    resumeCommand: '',
  },
];

function getQuickActionsPath() {
  return path.join(app.getPath('userData'), 'quick-actions.json');
}

function ensureId(action) {
  if (action.id) {
    return action;
  }
  const fallbackId = crypto.randomUUID ? crypto.randomUUID() : `action-${Date.now()}`;
  return { ...action, id: fallbackId };
}

async function readQuickActions() {
  const filePath = getQuickActionsPath();
  if (!fs.existsSync(filePath)) {
    return DEFAULT_ACTIONS;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ACTIONS;
    }
    return parsed.map(ensureId);
  } catch (error) {
    return DEFAULT_ACTIONS;
  }
}

async function writeQuickActions(actions) {
  const filePath = getQuickActionsPath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const normalized = Array.isArray(actions) ? actions.map(ensureId) : DEFAULT_ACTIONS;
  await fsp.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

module.exports = {
  readQuickActions,
  writeQuickActions,
};
