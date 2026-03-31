import { spawn } from 'node:child_process';
import {
  cleanupStagedElectronDist,
  stageConfiguredElectronDist,
} from './packagingPreflightShared';

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

function resolveBuilderArgs(mode: PackageMode, stagedElectronDist: string | null): string[] {
  const args =
    mode === 'lite'
      ? ['exec', 'electron-builder', '--mac', 'dmg']
      : mode === 'dir'
        ? ['exec', 'electron-builder', '--mac', '--dir']
        : ['exec', 'electron-builder', '--mac'];
  if (stagedElectronDist) {
    args.push(`--config.electronDist=${stagedElectronDist}`);
  }
  return args;
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
  let stagedElectronDist: string | null = null;
  try {
    stagedElectronDist = stageConfiguredElectronDist(process.cwd());
    await run('pnpm', resolveBuilderArgs(mode, stagedElectronDist), {
      TMPDIR: '/tmp',
    });
  } finally {
    cleanupStagedElectronDist(process.cwd());
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
