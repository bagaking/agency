// @ts-nocheck
const {
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  importEntries,
  revealEntry,
} = require('./explorer');

const SUPPORTED_INTENTS = new Set([
  'open',
  'reveal',
  'import_copy',
  'move',
  'copy',
  'delete',
  'create',
  'rename',
]);

function buildSuccess(intent, data = null, affectedPaths = [], warnings = []) {
  return {
    success: true,
    intent,
    affectedPaths: Array.isArray(affectedPaths) ? affectedPaths.filter(Boolean) : [],
    warnings: Array.isArray(warnings) ? warnings : [],
    failures: [],
    data,
  };
}

function buildFailure(intent, code, message, path) {
  const failure = { code, message: String(message || 'Unknown error.') };
  if (path) {
    failure.path = path;
  }
  return {
    success: false,
    intent,
    affectedPaths: [],
    warnings: [],
    failures: [failure],
    data: null,
  };
}

function normalizeIntent(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRelPath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '');
}

function normalizeSourcePaths(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
}

async function performFileIntent(payload = {}) {
  const intent = normalizeIntent(payload.intent);
  if (!SUPPORTED_INTENTS.has(intent)) {
    return buildFailure(intent || 'unknown', 'USER_ERROR', `Unsupported file intent: ${payload.intent || 'unknown'}`);
  }

  try {
    if (intent === 'open') {
      const targetPath = normalizeRelPath(payload.targetPath || payload.path || '');
      if (!targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'targetPath is required for open intent.');
      }
      return buildSuccess(intent, { path: targetPath }, [targetPath]);
    }

    if (intent === 'reveal') {
      const targetPath = normalizeRelPath(payload.targetPath || payload.path || '');
      if (!targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'targetPath is required for reveal intent.');
      }
      const data = await revealEntry({
        rootPath: payload.rootPath,
        targetPath,
      });
      return buildSuccess(intent, data, [targetPath]);
    }

    if (intent === 'import_copy') {
      const sourcePaths = normalizeSourcePaths(payload.sourcePaths);
      if (!sourcePaths.length) {
        return buildFailure(intent, 'USER_ERROR', 'sourcePaths must contain at least one path.');
      }
      const targetDir = normalizeRelPath(payload.targetDir || '');
      const report = await importEntries({
        rootPath: payload.rootPath,
        sourcePaths,
        targetDir,
      });
      const failures = Array.isArray(report?.failures) ? report.failures : [];
      const warnings = failures.map((failure) => ({
        code: 'IMPORT_PARTIAL_FAILURE',
        message: String(failure?.error || 'Import item failed.'),
      }));
      return buildSuccess(
        intent,
        report,
        Array.isArray(report?.importedPaths) ? report.importedPaths : [],
        warnings
      );
    }

    if (intent === 'copy') {
      const sourcePath = normalizeRelPath(payload.sourcePath || '');
      const targetPath = normalizeRelPath(payload.targetPath || '');
      if (!sourcePath || !targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'sourcePath and targetPath are required for copy intent.');
      }
      const data = await copyEntry({
        rootPath: payload.rootPath,
        sourcePath,
        targetPath,
      });
      return buildSuccess(intent, data, [targetPath]);
    }

    if (intent === 'move' || intent === 'rename') {
      const sourcePath = normalizeRelPath(payload.sourcePath || '');
      const targetPath = normalizeRelPath(payload.targetPath || '');
      if (!sourcePath || !targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'sourcePath and targetPath are required for move/rename intent.');
      }
      const data = await renameEntry({
        rootPath: payload.rootPath,
        sourcePath,
        targetPath,
      });
      return buildSuccess(intent, data, [targetPath]);
    }

    if (intent === 'delete') {
      const targetPath = normalizeRelPath(payload.targetPath || '');
      if (!targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'targetPath is required for delete intent.');
      }
      const data = await deleteEntry({
        rootPath: payload.rootPath,
        targetPath,
      });
      return buildSuccess(intent, data, [targetPath]);
    }

    if (intent === 'create') {
      const type = payload.type === 'dir' ? 'dir' : 'file';
      const parentPath = normalizeRelPath(payload.parentPath || '');
      const name = String(payload.name || '').trim();
      if (!name) {
        return buildFailure(intent, 'USER_ERROR', 'name is required for create intent.');
      }
      const data = await createEntry({
        rootPath: payload.rootPath,
        type,
        parentPath,
        name,
      });
      return buildSuccess(intent, data, [normalizeRelPath(data?.path || '')]);
    }

    return buildFailure(intent, 'USER_ERROR', `Unsupported file intent: ${intent}`);
  } catch (error) {
    return buildFailure(intent, 'FATAL', error?.message || String(error));
  }
}

async function performToolFileIntent(payload = {}) {
  const callerType = String(payload.callerType || '').trim();
  if (callerType && callerType !== 'tool') {
    return buildFailure(payload.intent || 'unknown', 'PERMISSION_DENIED', 'Tool intent requires callerType=tool.');
  }
  if (!payload.callerId) {
    return buildFailure(payload.intent || 'unknown', 'PERMISSION_DENIED', 'Tool intent requires callerId.');
  }
  return performFileIntent({ ...payload, callerType: 'tool' });
}

module.exports = {
  performFileIntent,
  performToolFileIntent,
};
