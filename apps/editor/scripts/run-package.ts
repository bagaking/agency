import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

type PackageMode = 'full' | 'lite' | 'dir';
type PackageGovernance = 'packageable' | 'release';

function parseArgs(): { mode: PackageMode; governance: PackageGovernance } {
  const args = process.argv.slice(2);
  const readFlag = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? String(args[index + 1] || '').trim().toLowerCase() : '';
  };
  const rawMode = readFlag('--mode');
  const rawGovernance = readFlag('--governance');
  const mode: PackageMode = rawMode === 'lite' ? 'lite' : rawMode === 'dir' ? 'dir' : 'full';
  const governance: PackageGovernance =
    rawGovernance === 'release' ? 'release' : 'packageable';
  return { mode, governance };
}

function run(command: string, args: string[], extraEnv: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

function buildReleaseBudgetEnv() {
  const env: Record<string, string> = {
    AGENCY_RENDERER_ALLOW_OVERRIDE: '',
  };
  const overrideNames = [
    'AGENCY_RENDERER_INITIAL_JS_RAW_BYTES',
    'AGENCY_RENDERER_INITIAL_JS_GZIP_BYTES',
    'AGENCY_RENDERER_INITIAL_CSS_RAW_BYTES',
    'AGENCY_RENDERER_INITIAL_CSS_GZIP_BYTES',
    'AGENCY_RENDERER_LARGEST_INITIAL_CHUNK_RAW_BYTES',
    'AGENCY_RENDERER_LARGEST_INITIAL_CHUNK_GZIP_BYTES',
  ];
  overrideNames.forEach((name) => {
    env[name] = '';
  });
  return env;
}

function resolveBuilderArgs(mode: PackageMode): string[] {
  return mode === 'lite'
    ? ['exec', 'electron-builder', '--mac', 'dmg']
    : mode === 'dir'
      ? ['exec', 'electron-builder', '--mac', '--dir']
      : ['exec', 'electron-builder', '--mac'];
}

async function withIsolatedElectronDist<T>(runWithDist: (electronDist: string) => Promise<T>): Promise<T> {
  const projectRoot = process.cwd();
  const sourceElectronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-electrondist-'));
  const isolatedElectronDist = path.join(tempRoot, 'dist');

  try {
    await fs.cp(sourceElectronDist, isolatedElectronDist, {
      recursive: true,
      force: true,
      dereference: false,
      verbatimSymlinks: true,
    });
    return await runWithDist(isolatedElectronDist);
  } finally {
    await fs.rm(tempRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function main() {
  const { mode, governance } = parseArgs();
  await run('pnpm', ['run', 'package:prepare', '--', '--mode', mode, '--governance', governance]);
  await run('pnpm', ['run', 'build:renderer']);
  if (governance === 'release') {
    await run('pnpm', ['run', 'check:renderer-bundle-budget'], buildReleaseBudgetEnv());
  }
  await run('pnpm', ['run', 'build:electron']);
  await run('pnpm', ['run', 'build:speech-helper']);
  await withIsolatedElectronDist(async (electronDist) => {
    await run('pnpm', [...resolveBuilderArgs(mode), `-c.electronDist=${electronDist}`], {
      TMPDIR: '/tmp',
    });
  });
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
