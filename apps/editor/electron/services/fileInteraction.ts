// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  importEntries,
  revealEntry,
} = require('./explorer');
const { logRuntime } = require('./runtimeLog');
const { resolveProjectRoot } = require('./projectRoot');
const { getRepoRoot } = require('./git');
const { normalizeRelPath, resolveSafePath } = require('./shared/pathSafety');

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

const TOOL_INTENT_CAPABILITY = {
  open: 'file.read',
  reveal: 'file.read',
  import_copy: 'file.write',
  move: 'file.write',
  copy: 'file.write',
  delete: 'file.write',
  create: 'file.write',
  rename: 'file.write',
};

const BUILTIN_SEMANTIC_RULES = [
  {
    id: 'agency-file',
    label: 'Agency',
    icon: 'file-text',
    priority: 300,
    matcherType: 'glob',
    matcherExpr: '**/Agency.md',
    source: 'builtin',
  },
  {
    id: 'spark-file',
    label: 'Spark',
    icon: 'sparkles',
    priority: 290,
    matcherType: 'regex',
    matcherExpr: '(^|/)spark(\\.[^/]+)?$',
    source: 'builtin',
  },
];

function normalizeIntent(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePath(value) {
  return normalizeRelPath(String(value || '').trim());
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

function buildFailure(intent, code, message, itemPath = '') {
  const failure = {
    code: String(code || 'FATAL'),
    message: String(message || 'Unknown error.'),
  };
  if (itemPath) {
    failure.path = itemPath;
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

function normalizeCapabilities(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizeCallerContext(payload = {}) {
  return {
    callerType: String(payload?.callerType || 'tool').trim().toLowerCase() || 'tool',
    callerId: String(payload?.callerId || '').trim(),
    traceId: String(payload?.traceId || '').trim(),
    sourceSurface: String(payload?.sourceSurface || '').trim(),
    capabilities: normalizeCapabilities(payload?.capabilities),
  };
}

async function logToolIntentAudit(level, message, meta = {}) {
  try {
    await logRuntime(level, message, meta);
  } catch (error) {
    // Runtime logging must never block file intents.
  }
}

async function resolveInteractionRoot(rootPath) {
  if (!rootPath) {
    const repoRoot = await resolveProjectRoot();
    return {
      repoRoot: repoRoot || '',
      rootPath: repoRoot || '',
    };
  }
  try {
    const repoRoot = await getRepoRoot(rootPath);
    return {
      repoRoot: repoRoot || '',
      rootPath: rootPath || repoRoot || '',
    };
  } catch (error) {
    const repoRoot = await resolveProjectRoot();
    return {
      repoRoot: repoRoot || '',
      rootPath: repoRoot || '',
    };
  }
}

function ensureRootResolved(resolved) {
  if (!resolved?.rootPath) {
    throw new Error('Project root is not configured.');
  }
}

async function performFileIntent(payload = {}) {
  const intent = normalizeIntent(payload.intent);
  if (!SUPPORTED_INTENTS.has(intent)) {
    return buildFailure(intent || 'unknown', 'USER_ERROR', `Unsupported file intent: ${payload.intent || 'unknown'}`);
  }

  try {
    if (intent === 'open') {
      const targetPath = normalizePath(payload.targetPath || payload.path || '');
      if (!targetPath) {
        return buildFailure(intent, 'USER_ERROR', 'targetPath is required for open intent.');
      }
      return buildSuccess(intent, { path: targetPath }, [targetPath]);
    }

    if (intent === 'reveal') {
      const targetPath = normalizePath(payload.targetPath || payload.path || '');
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
      const targetDir = normalizePath(payload.targetDir || '');
      const report = await importEntries({
        rootPath: payload.rootPath,
        sourcePaths,
        targetDir,
      });
      const warnings = (report?.failures || []).map((failure) => ({
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
      const sourcePath = normalizePath(payload.sourcePath || '');
      const targetPath = normalizePath(payload.targetPath || '');
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
      const sourcePath = normalizePath(payload.sourcePath || '');
      const targetPath = normalizePath(payload.targetPath || '');
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
      const targetPath = normalizePath(payload.targetPath || '');
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
      const parentPath = normalizePath(payload.parentPath || '');
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
      return buildSuccess(intent, data, [normalizePath(data?.path || '')]);
    }

    return buildFailure(intent, 'USER_ERROR', `Unsupported file intent: ${intent}`);
  } catch (error) {
    return buildFailure(intent, 'FATAL', error?.message || String(error));
  }
}

function parseRegexMatcher(expression) {
  const raw = String(expression || '').trim();
  if (!raw) {
    return null;
  }
  try {
    if (raw.startsWith('/') && raw.lastIndexOf('/') > 0) {
      const lastSlash = raw.lastIndexOf('/');
      const body = raw.slice(1, lastSlash);
      const flags = raw.slice(lastSlash + 1) || 'i';
      return new RegExp(body, flags.includes('i') ? flags : `${flags}i`);
    }
    return new RegExp(raw, 'i');
  } catch (error) {
    return null;
  }
}

function globToRegExp(expression) {
  const raw = String(expression || '').trim();
  if (!raw) {
    return null;
  }
  const escaped = raw.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withDouble = escaped.replace(/\*\*/g, '__DOUBLE_STAR__');
  const withSingle = withDouble.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  const pattern = withSingle.replace(/__DOUBLE_STAR__/g, '.*');
  try {
    return new RegExp(`^${pattern}$`, 'i');
  } catch (error) {
    return null;
  }
}

function normalizeSemanticRule(rule, source = 'project', index = 0) {
  const matcherType = String(rule?.matcherType || 'glob').toLowerCase() === 'regex' ? 'regex' : 'glob';
  const matcherExpr = String(rule?.matcherExpr || '').trim();
  if (!matcherExpr) {
    return null;
  }
  const compiled = matcherType === 'regex' ? parseRegexMatcher(matcherExpr) : globToRegExp(matcherExpr);
  if (!compiled) {
    return null;
  }
  const fallbackPriority = source === 'builtin' ? 200 : 100;
  const rawPriority = Number(rule?.priority);
  const priority = Number.isFinite(rawPriority) ? rawPriority : fallbackPriority;
  const id = String(rule?.id || `${source}-${index + 1}`).trim();
  const label = String(rule?.label || id).trim();
  return {
    id,
    label,
    icon: rule?.icon ? String(rule.icon) : '',
    priority,
    matcherType,
    matcherExpr,
    source,
    compiled,
  };
}

function matchSemanticRules(relativePath, rules) {
  const normalizedPath = normalizePath(relativePath);
  const baseName = path.posix.basename(normalizedPath);
  const matched = [];
  for (const rule of rules) {
    if (!rule?.compiled) {
      continue;
    }
    const hit = rule.compiled.test(normalizedPath) || rule.compiled.test(baseName);
    if (!hit) {
      continue;
    }
    matched.push({
      id: rule.id,
      label: rule.label,
      icon: rule.icon,
      priority: rule.priority,
      matcherType: rule.matcherType,
      matcherExpr: rule.matcherExpr,
      source: rule.source,
    });
  }
  matched.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.id.localeCompare(b.id);
  });
  return matched;
}

async function readProjectSemanticRules(rootPath) {
  const configPath = path.join(rootPath, '.agency', 'agent-files.yaml');
  try {
    await fs.promises.access(configPath);
  } catch (error) {
    return { rules: [], warnings: [] };
  }

  try {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    const parsed = yaml.load(content) || {};
    const rawRules = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rules) ? parsed.rules : [];
    const normalized = rawRules
      .map((rule, index) => normalizeSemanticRule(rule, 'project', index))
      .filter(Boolean);
    return { rules: normalized, warnings: [] };
  } catch (error) {
    return {
      rules: [],
      warnings: [
        {
          code: 'SEMANTIC_RULES_PARSE_FAILED',
          message: `Failed to parse .agency/agent-files.yaml: ${error?.message || String(error)}`,
        },
      ],
    };
  }
}

async function classifyAgentFiles(payload = {}) {
  const intent = 'classify';
  try {
    const resolved = await resolveInteractionRoot(payload.rootPath);
    ensureRootResolved(resolved);
    const rootAbsolute = path.resolve(resolved.rootPath);
    const incomingPaths = Array.isArray(payload.paths) ? payload.paths : [];
    const normalizedPaths = Array.from(
      new Set(
        incomingPaths
          .map((item) => normalizePath(item))
          .filter(Boolean)
      )
    );

    const warnings = [];
    const safePaths = [];
    for (const relativePath of normalizedPaths) {
      try {
        resolveSafePath(rootAbsolute, relativePath);
        safePaths.push(relativePath);
      } catch (error) {
        warnings.push({
          code: 'INVALID_PATH',
          message: `Skipped path outside root: ${relativePath}`,
        });
      }
    }

    const builtins = BUILTIN_SEMANTIC_RULES
      .map((rule, index) => normalizeSemanticRule(rule, 'builtin', index))
      .filter(Boolean);
    const project = await readProjectSemanticRules(rootAbsolute);
    const allRules = [...builtins, ...project.rules];
    const tagsByPath = {};
    safePaths.forEach((relativePath) => {
      tagsByPath[relativePath] = matchSemanticRules(relativePath, allRules);
    });

    return buildSuccess(
      intent,
      {
        rootPath: rootAbsolute,
        tagsByPath,
        rules: allRules.map((rule) => ({
          id: rule.id,
          label: rule.label,
          icon: rule.icon,
          priority: rule.priority,
          matcherType: rule.matcherType,
          matcherExpr: rule.matcherExpr,
          source: rule.source,
        })),
      },
      safePaths,
      [...warnings, ...project.warnings]
    );
  } catch (error) {
    return buildFailure(intent, 'FATAL', error?.message || String(error));
  }
}

async function performToolFileIntent(payload = {}) {
  const intent = normalizeIntent(payload.intent);
  const callerContext = normalizeCallerContext(payload);
  if (!callerContext.callerId) {
    await logToolIntentAudit('warn', 'file tool intent denied', {
      intent,
      reason: 'missing-caller-id',
      callerType: callerContext.callerType,
      sourceSurface: callerContext.sourceSurface,
    });
    return buildFailure(intent || 'unknown', 'PERMISSION_DENIED', 'Tool intent requires callerId.');
  }
  if (!callerContext.traceId) {
    await logToolIntentAudit('warn', 'file tool intent denied', {
      intent,
      callerId: callerContext.callerId,
      reason: 'missing-trace-id',
      callerType: callerContext.callerType,
      sourceSurface: callerContext.sourceSurface,
    });
    return buildFailure(intent || 'unknown', 'PERMISSION_DENIED', 'Tool intent requires traceId.');
  }
  const requiredCapability = TOOL_INTENT_CAPABILITY[intent] || 'file.write';
  if (!callerContext.capabilities.includes(requiredCapability)) {
    await logToolIntentAudit('warn', 'file tool intent denied', {
      intent,
      callerId: callerContext.callerId,
      traceId: callerContext.traceId,
      reason: 'missing-capability',
      requiredCapability,
      capabilities: callerContext.capabilities,
      sourceSurface: callerContext.sourceSurface,
    });
    return buildFailure(
      intent || 'unknown',
      'PERMISSION_DENIED',
      `Tool intent requires capability: ${requiredCapability}.`
    );
  }
  const response = await performFileIntent({
    ...payload,
    callerType: callerContext.callerType,
    callerId: callerContext.callerId,
    traceId: callerContext.traceId,
    sourceSurface: callerContext.sourceSurface || payload.sourceSurface || 'agent-tool',
  });
  await logToolIntentAudit(response?.success ? 'info' : 'warn', 'file tool intent completed', {
    intent,
    callerId: callerContext.callerId,
    traceId: callerContext.traceId,
    sourceSurface: callerContext.sourceSurface || payload.sourceSurface || 'agent-tool',
    success: Boolean(response?.success),
    failureCount: Array.isArray(response?.failures) ? response.failures.length : 0,
    warningCount: Array.isArray(response?.warnings) ? response.warnings.length : 0,
  });
  return response;
}

module.exports = {
  performFileIntent,
  performToolFileIntent,
  classifyAgentFiles,
};
