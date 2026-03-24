// @ts-nocheck
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const fsp = fs.promises;

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

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'agency-harness-provider-'));
  const schemaPath = path.join(tempDir, 'decision-schema.json');
  await fsp.writeFile(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');

  const childArgs = [...args, '--json', '--output-schema', schemaPath, '-'];
  const child = spawn(command, childArgs, {
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
  runJsonProviderProcess,
};
