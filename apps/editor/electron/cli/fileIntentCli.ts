#!/usr/bin/env node
// @ts-nocheck
const fs = require('fs');

const {
  performFileIntent,
  performToolFileIntent,
  classifyAgentFiles,
} = require('../services/fileInteraction');

function printUsage() {
  process.stdout.write(
    [
      'Agency file-intent CLI',
      '',
      'Usage:',
      '  node .electron-build/electron/cli/fileIntentCli.js --mode <user|tool|classify> --json \'<payload-json>\'',
      '  node .electron-build/electron/cli/fileIntentCli.js --mode <user|tool|classify> --file <payload-json-file>',
      '  echo \'<payload-json>\' | node .electron-build/electron/cli/fileIntentCli.js --mode <user|tool|classify>',
      '',
      'Notes:',
      '- `--mode` defaults to `user`.',
      '- JSON-in / JSON-out schema is intentionally thin over the unified gateway.',
      '- For tool mode, include caller metadata and capabilities.',
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
    mode: 'user',
    json: '',
    file: '',
    modeExplicit: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--mode') {
      parsed.mode = String(argv[index + 1] || '').trim() || 'user';
      parsed.modeExplicit = true;
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

async function resolveRequestInput(args) {
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
  const parsed = JSON.parse(jsonText);
  const envelopeMode = String(parsed?.mode || '').trim();
  const request = parsed && typeof parsed === 'object' && parsed.request ? parsed.request : parsed;
  const mode = (args.modeExplicit ? args.mode : (envelopeMode || args.mode || 'user')).toLowerCase();
  return { mode, request };
}

async function dispatchRequest(mode, request) {
  if (mode === 'tool') {
    return performToolFileIntent(request || {});
  }
  if (mode === 'classify') {
    return classifyAgentFiles(request || {});
  }
  return performFileIntent(request || {});
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const input = await resolveRequestInput(args);
    if (input.help) {
      printUsage();
      process.exit(0);
      return;
    }
    const result = await dispatchRequest(input.mode, input.request);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result?.success === false) {
      process.exit(2);
      return;
    }
    process.exit(0);
  } catch (error) {
    const result = {
      success: false,
      intent: 'cli',
      affectedPaths: [],
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
