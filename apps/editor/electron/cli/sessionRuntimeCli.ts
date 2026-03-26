#!/usr/bin/env node
// @ts-nocheck
const fs = require('fs');

const { performSessionRuntimeIntent } = require('../services/sessionRuntime');

function printUsage() {
  process.stdout.write(
    [
      'Agency session-runtime CLI',
      '',
      'Usage:',
      '  node .electron-build/electron/cli/sessionRuntimeCli.js --json \'<payload-json>\'',
      '  node .electron-build/electron/cli/sessionRuntimeCli.js --file <payload-json-file>',
      '  echo \'<payload-json>\' | node .electron-build/electron/cli/sessionRuntimeCli.js',
      '',
      'Notes:',
      '- JSON-in / JSON-out schema is intentionally thin over the host session runtime gateway.',
      '- Include caller metadata for tool or harness callers when available.',
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
    json: '',
    file: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
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
    throw new Error('Missing payload JSON. Use --json, --file, or stdin.');
  }
  return JSON.parse(jsonText);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const payload = await resolvePayload(args);
    if (payload.help) {
      printUsage();
      process.exit(0);
      return;
    }
    const result = await performSessionRuntimeIntent(payload || {});
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result?.success === false ? 2 : 0);
  } catch (error) {
    const result = {
      success: false,
      intent: 'cli',
      warnings: [],
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
