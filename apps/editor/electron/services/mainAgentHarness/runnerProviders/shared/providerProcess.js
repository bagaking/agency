// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const fsp = fs.promises;
const execFileAsync = promisify(execFile);

function isExecutable(filePath) {
  const candidate = String(filePath || '').trim();
  if (!candidate || !fs.existsSync(candidate)) {
    return false;
  }
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch (_error) {
    return false;
  }
}

function resolveExecutableFromPath(command, env = process.env) {
  const normalized = String(command || '').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.includes(path.sep)) {
    return isExecutable(normalized) ? normalized : '';
  }
  const searchPath = String(env?.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dirPath of searchPath) {
    const candidate = path.join(dirPath, normalized);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return '';
}

function shellEscape(value) {
  return `'${String(value || '').replace(/'/g, `'\\''`)}'`;
}

async function resolveFromLoginShell(command, { env = process.env, execFileRunner = execFileAsync } = {}) {
  const normalized = String(command || '').trim();
  if (!normalized) {
    return '';
  }
  const candidates = Array.from(
    new Set(
      [env?.SHELL, '/bin/zsh', '/bin/bash']
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .filter((item) => isExecutable(item))
    )
  );
  for (const shellPath of candidates) {
    try {
      // Use a login shell so GUI-launched Electron can recover user-managed paths such as nvm.
      const result = await execFileRunner(shellPath, [
        '-lc',
        `command -v ${shellEscape(normalized)}`,
      ], {
        env,
      });
      const resolved = String(result?.stdout || '')
        .split(/\r?\n/)
        .map((line) => String(line || '').trim())
        .find(Boolean);
      if (resolved && isExecutable(resolved)) {
        return resolved;
      }
    } catch (_error) {
      // Ignore and continue to the next shell candidate.
    }
  }
  return '';
}

function resolveFromCommonNodeManagerDirs(command, { homeDir = os.homedir() } = {}) {
  const normalized = String(command || '').trim();
  if (!normalized) {
    return '';
  }
  const directCandidates = [
    path.join(homeDir, '.volta', 'bin', normalized),
  ];
  for (const candidate of directCandidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  const nvmRoot = path.join(homeDir, '.nvm', 'versions', 'node');
  if (!fs.existsSync(nvmRoot)) {
    return '';
  }
  const versionDirs = fs.readdirSync(nvmRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
  for (const versionDir of versionDirs) {
    const candidate = path.join(nvmRoot, versionDir, 'bin', normalized);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return '';
}

async function resolveProviderCommand(command, overrides = {}) {
  const normalized = String(command || '').trim();
  if (!normalized) {
    return '';
  }
  const env = overrides?.env || process.env;
  const explicit =
    normalized === 'codex'
      ? String(env.AGENCY_CODEX_CLI_COMMAND || env.AGENCY_CLI_COMMAND || '').trim()
      : '';
  if (explicit) {
    const explicitResolved = resolveExecutableFromPath(explicit, env);
    if (explicitResolved) {
      return explicitResolved;
    }
  }
  const direct = resolveExecutableFromPath(normalized, env);
  if (direct) {
    return direct;
  }
  const shellResolved = await resolveFromLoginShell(normalized, overrides);
  if (shellResolved) {
    return shellResolved;
  }
  const commonResolved = resolveFromCommonNodeManagerDirs(normalized, overrides);
  if (commonResolved) {
    return commonResolved;
  }
  return '';
}

async function runJsonProviderProcess({
  command,
  args = [],
  schema,
  input = '',
  cwd = process.cwd(),
  env = process.env,
  abortSignal,
  parseJsonlOutput,
} = {}) {
  if (!command) {
    throw new Error('Provider command is required.');
  }
  if (!schema || typeof schema !== 'object') {
    throw new Error('Provider decision schema is required.');
  }
  if (typeof parseJsonlOutput !== 'function') {
    throw new Error('parseJsonlOutput is required.');
  }
  const resolvedCommand = await resolveProviderCommand(command, { env });
  if (!resolvedCommand) {
    const error = new Error(
      `Provider command not found or not executable: ${command}.`
    );
    error.code = 'PROVIDER_COMMAND_NOT_FOUND';
    error.data = {
      command: String(command || '').trim(),
      path: String(env?.PATH || ''),
    };
    throw error;
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'agency-harness-provider-'));
  const schemaPath = path.join(tempDir, 'decision-schema.json');
  await fsp.writeFile(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

  const childArgs = [...args, '--json', '--output-schema', schemaPath, '-'];
  const child = spawn(resolvedCommand, childArgs, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let aborted = false;
  const cleanupAbort = abortSignal
    ? () => {
        aborted = true;
        child.kill('SIGTERM');
      }
    : null;

  if (abortSignal && typeof abortSignal.addEventListener === 'function') {
    if (abortSignal.aborted) {
      cleanupAbort();
    } else {
      abortSignal.addEventListener('abort', cleanupAbort, { once: true });
    }
  }

  const exitCode = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(Number.isFinite(code) ? code : 1));
    if (input) {
      child.stdin.write(String(input));
    }
    child.stdin.end();
  }).finally(async () => {
    if (abortSignal && cleanupAbort) {
      abortSignal.removeEventListener('abort', cleanupAbort);
    }
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  });

  if (aborted) {
    const error = new Error('Provider execution was cancelled.');
    error.code = 'RUN_CANCELLED';
    throw error;
  }

  const events = parseJsonlOutput(stdout);
  if (exitCode !== 0) {
    const error = new Error(
      `Provider process exited with code ${exitCode}: ${String(stderr || stdout).trim()}`
    );
    error.code = 'PROVIDER_PROCESS_FAILED';
    error.data = {
      exitCode,
      stderr: String(stderr || '').trim(),
      stdout: String(stdout || '').trim(),
      events,
    };
    throw error;
  }

  return {
    exitCode,
    stdout,
    stderr,
    events,
  };
}

module.exports = {
  resolveProviderCommand,
  runJsonProviderProcess,
};
