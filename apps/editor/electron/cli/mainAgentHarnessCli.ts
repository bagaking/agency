#!/usr/bin/env node
// @ts-nocheck
const fs = require('fs');

const {
  cancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  listMainAgentHarnessRuns,
  resumeMainAgentHarnessRun,
  startMainAgentHarnessRun,
} = require('../services/mainAgentHarness');

function printUsage() {
  process.stdout.write(
    [
      'Agency main-agent-harness CLI',
      '',
      'Usage:',
      '  node .electron-build/cli/mainAgentHarnessCli.js --action start --json \'<payload-json>\'',
      '  node .electron-build/cli/mainAgentHarnessCli.js --action inspect --json \'{"runId":"run-..."}\'',
      '  node .electron-build/cli/mainAgentHarnessCli.js --action cancel --json \'{"runId":"run-..."}\'',
      '  node .electron-build/cli/mainAgentHarnessCli.js --action resume --json \'{"runId":"run-..."}\'',
      '  node .electron-build/cli/mainAgentHarnessCli.js --action list --json \'{"limit":20}\'',
      '',
      'Notes:',
      '- JSON-in / JSON-out wrapper over the main agent harness control plane.',
      '- The payload shape stays close to the IPC contract.',
      '- `start` waits for terminal run completion by default so the process does not exit before the in-process controller finishes.',
      '',
    ].join('\n')
  );
}

async function readStdinText() {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

function parseArgs(argv) {
  const parsed = {
    action: '',
    json: '',
    file: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--action') {
      parsed.action = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--json') {
      parsed.json = String(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--file') {
      parsed.file = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (!arg.startsWith('--') && !parsed.json) {
      parsed.json = arg;
    }
  }
  return parsed;
}

async function resolvePayload(args) {
  if (args.help) {
    return { help: true };
  }
  let jsonText = args.json || '';
  if (!jsonText && args.file) {
    jsonText = fs.readFileSync(args.file, 'utf-8');
  }
  if (!jsonText) {
    jsonText = await readStdinText();
  }
  if (!jsonText) {
    return {};
  }
  return JSON.parse(jsonText);
}

async function dispatch(action, payload) {
  const normalizedAction = String(action || payload?.action || 'start').trim().toLowerCase();
  if (normalizedAction === 'inspect') {
    return inspectMainAgentHarnessRun(payload || {});
  }
  if (normalizedAction === 'cancel') {
    return cancelMainAgentHarnessRun(payload || {});
  }
  if (normalizedAction === 'resume') {
    return resumeMainAgentHarnessRun(payload || {});
  }
  if (normalizedAction === 'list') {
    return listMainAgentHarnessRuns(payload || {});
  }
  const started = await startMainAgentHarnessRun(payload || {});
  if (payload?.wait === false) {
    return started;
  }
  const runId = String(started?.runId || '').trim();
  if (!runId) {
    return started;
  }
  for (;;) {
    const current = await inspectMainAgentHarnessRun({ runId });
    if (['succeeded', 'failed', 'cancelled'].includes(String(current?.status || '').trim())) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const payload = await resolvePayload(args);
    if (args.help) {
      printUsage();
      process.exit(0);
      return;
    }
    const result = await dispatch(args.action, payload);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
  } catch (error) {
    const result = {
      success: false,
      action: 'cli',
      failures: [
        {
          code: 'CLI_ERROR',
          message: error?.message || String(error),
        },
      ],
      data: null,
    };
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(1);
  }
}

main();
