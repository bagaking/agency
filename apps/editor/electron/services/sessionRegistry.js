const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const fsp = fs.promises;

const AGENCY_DIR = '.agency';
const SESSION_PREFIX = 'sessions-';
const SESSION_EXT = '.yaml';

function getWorktreeName(worktreePath) {
  return path.basename(worktreePath);
}

function getSessionRegistryPath(worktreePath) {
  const worktreeName = getWorktreeName(worktreePath);
  return path.join(worktreePath, AGENCY_DIR, `${SESSION_PREFIX}${worktreeName}${SESSION_EXT}`);
}

async function readRegistry(worktreePath) {
  const registryPath = getSessionRegistryPath(worktreePath);
  if (!fs.existsSync(registryPath)) {
    return {
      version: 1,
      sessions: [],
    };
  }
  try {
    const raw = await fsp.readFile(registryPath, 'utf-8');
    const parsed = yaml.load(raw) || {};
    return {
      version: parsed.version || 1,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch (error) {
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${registryPath}.corrupt-${suffix}`;
    try {
      await fsp.rename(registryPath, backupPath);
      console.warn(`Session registry was invalid. Backed up to ${backupPath}`);
    } catch (renameError) {
      console.warn('Session registry was invalid and could not be backed up.', renameError);
    }
    return {
      version: 1,
      sessions: [],
    };
  }
}

async function writeRegistry(worktreePath, registry) {
  const registryPath = getSessionRegistryPath(worktreePath);
  await fsp.mkdir(path.dirname(registryPath), { recursive: true });
  const content = yaml.dump(registry, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${registryPath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, registryPath);
}

function upsertSession(registry, session) {
  const next = { ...registry };
  const sessions = Array.isArray(next.sessions) ? [...next.sessions] : [];
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    sessions[index] = { ...sessions[index], ...session };
  } else {
    sessions.push(session);
  }
  next.sessions = sessions;
  return next;
}

function removeSession(registry, sessionId) {
  const next = { ...registry };
  next.sessions = (next.sessions || []).filter((item) => item.id !== sessionId);
  return next;
}

module.exports = {
  getSessionRegistryPath,
  readRegistry,
  writeRegistry,
  upsertSession,
  removeSession,
};
