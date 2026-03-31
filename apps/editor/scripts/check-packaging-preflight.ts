import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  estimateConfiguredElectronDistStageBytes,
  validateConfiguredElectronDist,
} from './packagingPreflightShared';

type Mode = 'dir' | 'full' | 'lite';
type Governance = 'packageable' | 'release';
type DiskCheck = {
  targetPath: string;
  filesystem: string;
  availableBytes: number;
};

const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const releaseOutputRoot = path.join(projectRoot, 'dist', 'release');
const electronBuilderCacheRoot = path.join(os.homedir(), 'Library', 'Caches', 'electron-builder');
const macCachesRoot = path.join(os.homedir(), 'Library', 'Caches');
const modeArgIndex = process.argv.findIndex((value) => value === '--mode');
const governanceArgIndex = process.argv.findIndex((value) => value === '--governance');
const modeValue =
  modeArgIndex >= 0 && process.argv[modeArgIndex + 1]
    ? String(process.argv[modeArgIndex + 1]).trim().toLowerCase()
    : 'dmg';
const governanceValue =
  governanceArgIndex >= 0 && process.argv[governanceArgIndex + 1]
    ? String(process.argv[governanceArgIndex + 1]).trim().toLowerCase()
    : 'packageable';
const mode: Mode =
  modeValue === 'dir' ? 'dir' : modeValue === 'lite' ? 'lite' : 'full';
const governance: Governance = governanceValue === 'release' ? 'release' : 'packageable';

function parsePositiveGiBOverride(envKey: string, fallbackGiB: number): number {
  const raw = String(process.env[envKey] || '').trim();
  if (!raw) {
    return fallbackGiB;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `[package-preflight] ${envKey} must be a positive number of GiB. Received: ${raw}`
    );
  }
  return parsed;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function getDiskCheck(targetPath: string): DiskCheck {
  const output = execFileSync('df', ['-kP', targetPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const lines = output.split('\n').filter(Boolean);
  const dataLine = lines[lines.length - 1] || '';
  const columns = dataLine.trim().split(/\s+/);
  const filesystem = String(columns[0] || '').trim();
  const availableKib = Number(columns[3] || 0);
  if (!filesystem || !Number.isFinite(availableKib) || availableKib <= 0) {
    throw new Error(`Unable to parse free disk space from df output for ${targetPath}.`);
  }
  return {
    targetPath,
    filesystem,
    availableBytes: availableKib * 1024,
  };
}

function getPathSizeBytes(targetPath: string): number {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }
  const output = execFileSync('du', ['-sk', targetPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const dataLine = output.split('\n').filter(Boolean)[0] || '';
  const sizeKib = Number(dataLine.trim().split(/\s+/)[0] || 0);
  return Number.isFinite(sizeKib) && sizeKib > 0 ? sizeKib * 1024 : 0;
}

function removePath(targetPath: string): void {
  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  } catch (error) {
    execFileSync('/bin/rm', ['-rf', targetPath], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (fs.existsSync(targetPath)) {
      throw error;
    }
  }
}

function getChecks(targetPaths: string[]): DiskCheck[] {
  return targetPaths.map((targetPath) => getDiskCheck(targetPath));
}

function resolveDiskCheckTarget(targetPath: string, fallbackTarget: string): string {
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  return fallbackTarget;
}

function resolveRequiredBytesForCheck(
  check: DiskCheck,
  baseRequiredBytes: number,
  stagedElectronDistBytes: number
): number {
  if (check.targetPath === projectRoot) {
    return baseRequiredBytes + stagedElectronDistBytes;
  }
  return baseRequiredBytes;
}

function isFailing(
  checks: DiskCheck[],
  requiredBytes: number,
  stagedElectronDistBytes: number
): boolean {
  return checks.some(
    (entry) =>
      entry.availableBytes <
      resolveRequiredBytesForCheck(entry, requiredBytes, stagedElectronDistBytes)
  );
}

function estimateChecksAfterCleanup(checks: DiskCheck[], cleanupPaths: string[]): DiskCheck[] {
  const reclaimedByFilesystem = new Map<string, number>();

  cleanupPaths.forEach((cleanupPath) => {
    if (!fs.existsSync(cleanupPath)) {
      return;
    }
    const reclaimBytes = getPathSizeBytes(cleanupPath);
    if (reclaimBytes <= 0) {
      return;
    }
    const filesystem = getDiskCheck(cleanupPath).filesystem;
    reclaimedByFilesystem.set(
      filesystem,
      (reclaimedByFilesystem.get(filesystem) || 0) + reclaimBytes
    );
  });

  return checks.map((check) => ({
    ...check,
    availableBytes: check.availableBytes + (reclaimedByFilesystem.get(check.filesystem) || 0),
  }));
}

function listStaleReleaseOutputs(modeToClean: Mode): string[] {
  if (!fs.existsSync(releaseOutputRoot)) {
    return [];
  }

  const entries = fs.readdirSync(releaseOutputRoot, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(releaseOutputRoot, entry.name);
    const lowerName = entry.name.toLowerCase();

    if (entry.isDirectory() && (entry.name === 'mac' || entry.name.startsWith('mac-'))) {
      return [fullPath];
    }

    if (!entry.isFile()) {
      return [];
    }

    if (
      lowerName === 'builder-debug.yml' ||
      lowerName === 'builder-effective-config.yaml' ||
      lowerName === '.ds_store'
    ) {
      return [fullPath];
    }

    if (
      (modeToClean === 'full' || modeToClean === 'lite') &&
      (lowerName.endsWith('.zip') || lowerName.endsWith('.blockmap'))
    ) {
      return [fullPath];
    }

    if ((modeToClean === 'full' || modeToClean === 'lite') && lowerName.endsWith('.dmg')) {
      return [fullPath];
    }

    return [];
  });
}

function cleanupStaleReleaseOutputs(modeToClean: Mode): {
  removedPaths: string[];
  reclaimedBytes: number;
} {
  const candidates = listStaleReleaseOutputs(modeToClean);
  let reclaimedBytes = 0;
  const removedPaths: string[] = [];

  candidates.forEach((candidate) => {
    if (!fs.existsSync(candidate)) {
      return;
    }
    reclaimedBytes += getPathSizeBytes(candidate);
    removePath(candidate);
    removedPaths.push(candidate);
  });

  return { removedPaths, reclaimedBytes };
}

function getRetryCommandForMode(modeToRetry: Mode, nextGovernance: Governance): string {
  const base = nextGovernance === 'release' ? 'release' : '';
  if (modeToRetry === 'dir') {
    return base
      ? 'pnpm run package:clean && pnpm run package:dir:release'
      : 'pnpm run package:clean && pnpm run package:dir';
  }
  if (modeToRetry === 'lite') {
    return base
      ? 'pnpm run package:clean && pnpm run package:lite:release'
      : 'pnpm run package:clean && pnpm run package:lite';
  }
  return base
    ? 'pnpm run package:clean && pnpm run package:release'
    : 'pnpm run package:clean && pnpm run package';
}

function main(): void {
  const minFreeGiBByMode: Record<Mode, number> = {
    dir: parsePositiveGiBOverride('AGENCY_PACKAGE_DIR_MIN_FREE_GIB', 2),
    full: parsePositiveGiBOverride('AGENCY_PACKAGE_DMG_MIN_FREE_GIB', 4),
    lite: parsePositiveGiBOverride('AGENCY_PACKAGE_LITE_MIN_FREE_GIB', 3),
  };
  const requiredBytes = minFreeGiBByMode[mode] * 1024 * 1024 * 1024;
  const pathsToCheck = [
    projectRoot,
    '/tmp',
    resolveDiskCheckTarget(electronBuilderCacheRoot, macCachesRoot),
  ];
  const retryCommand = getRetryCommandForMode(mode, governance);
  validateConfiguredElectronDist(projectRoot, retryCommand);
  const cleanup = cleanupStaleReleaseOutputs(mode);
  const initialChecks = getChecks(pathsToCheck);
  const stagedElectronDistBytes = estimateConfiguredElectronDistStageBytes(projectRoot);

  if (!isFailing(initialChecks, requiredBytes, stagedElectronDistBytes)) {
    const prefix =
      cleanup.removedPaths.length > 0
        ? `[package-preflight] mode=${mode} governance=${governance} free-space ok after cleaning stale release outputs`
        : `[package-preflight] mode=${mode} governance=${governance} free-space ok`;
    console.log(`${prefix} (${initialChecks
      .map((entry) => {
        const requiredForEntry = resolveRequiredBytesForCheck(
          entry,
          requiredBytes,
          stagedElectronDistBytes
        );
        const requiredLabel =
          requiredForEntry === requiredBytes
            ? ''
            : ` / requires ${formatBytes(requiredForEntry)} incl. staged electronDist`;
        return `${entry.targetPath}: ${formatBytes(entry.availableBytes)}${requiredLabel}`;
      })
      .join(', ')})`);
    if (cleanup.removedPaths.length > 0) {
      console.log(
        `[package-preflight] removed ${cleanup.removedPaths.length} stale output(s), reclaimed ${formatBytes(cleanup.reclaimedBytes)}.`
      );
    }
    return;
  }
  const checks = initialChecks;

  const fullDistCleanEstimate = fs.existsSync(distRoot)
    ? estimateChecksAfterCleanup(checks, [distRoot])
    : checks;
  const fullDistCleanWouldPass =
    fs.existsSync(distRoot) &&
    getPathSizeBytes(distRoot) > 0 &&
    !isFailing(fullDistCleanEstimate, requiredBytes, stagedElectronDistBytes);
  const fullDistCleanBytes = fs.existsSync(distRoot) ? getPathSizeBytes(distRoot) : 0;

  const lines = [
    `[package-preflight] insufficient free space for mode=${mode} governance=${governance}.`,
    `required: at least ${minFreeGiBByMode[mode]} GiB free on each checked volume, plus any staged electronDist copy on the project volume.`,
    ...checks.map(
      (entry) =>
        `observed: ${entry.targetPath} -> ${formatBytes(entry.availableBytes)} free (needs ${formatBytes(
          resolveRequiredBytesForCheck(entry, requiredBytes, stagedElectronDistBytes)
        )})`
    ),
    ...(cleanup.removedPaths.length > 0
      ? [
          `cleanup: removed ${cleanup.removedPaths.length} stale output(s), reclaimed ${formatBytes(cleanup.reclaimedBytes)}`,
        ]
      : []),
    ...(stagedElectronDistBytes > 0
      ? [
          `electronDist stage: estimated ${formatBytes(stagedElectronDistBytes)} temporary copy on ${projectRoot}`,
        ]
      : []),
    'suggested actions:',
    '- preflight already deletes stale generated outputs in apps/editor/dist/release when they would block the current mode',
    ...(fullDistCleanWouldPass
      ? [
          `- run \`${retryCommand}\` to remove all generated dist outputs first; estimated reclaim: ${formatBytes(fullDistCleanBytes)}`,
        ]
      : []),
    '- clear ~/Library/Caches/electron-builder if it is safe to do so',
    ...(governance === 'release'
      ? [
          '- use `pnpm run package:lite:release` when you need a DMG-only release-gated build',
          '- use `pnpm run package:dir:release` when you need an unpacked release-gated build',
        ]
      : [
          '- use `pnpm run package:lite` to build only the DMG with a lower free-space threshold',
          '- use `pnpm run package:dir` when you only need an unpacked app',
        ]),
  ];
  console.error(lines.join('\n'));
  process.exit(1);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
