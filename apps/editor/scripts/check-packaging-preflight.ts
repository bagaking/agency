import { execFileSync } from 'node:child_process';
import path from 'node:path';

type Mode = 'dir' | 'dmg';

const projectRoot = path.join(__dirname, '..');
const modeArgIndex = process.argv.findIndex((value) => value === '--mode');
const modeValue =
  modeArgIndex >= 0 && process.argv[modeArgIndex + 1]
    ? String(process.argv[modeArgIndex + 1]).trim().toLowerCase()
    : 'dmg';
const mode: Mode = modeValue === 'dir' ? 'dir' : 'dmg';

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

function getAvailableBytes(targetPath: string): number {
  const output = execFileSync('df', ['-kP', targetPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const lines = output.split('\n').filter(Boolean);
  const dataLine = lines[lines.length - 1] || '';
  const columns = dataLine.trim().split(/\s+/);
  const availableKib = Number(columns[3] || 0);
  if (!Number.isFinite(availableKib) || availableKib <= 0) {
    throw new Error(`Unable to parse free disk space from df output for ${targetPath}.`);
  }
  return availableKib * 1024;
}

function main(): void {
  const minFreeGiBByMode: Record<Mode, number> = {
    dir: parsePositiveGiBOverride('AGENCY_PACKAGE_DIR_MIN_FREE_GIB', 2),
    dmg: parsePositiveGiBOverride('AGENCY_PACKAGE_DMG_MIN_FREE_GIB', 4),
  };
  const requiredBytes = minFreeGiBByMode[mode] * 1024 * 1024 * 1024;
  const pathsToCheck = [projectRoot, '/tmp'];
  const checks = pathsToCheck.map((targetPath) => ({
    targetPath,
    availableBytes: getAvailableBytes(targetPath),
  }));
  const failing = checks.find((entry) => entry.availableBytes < requiredBytes);
  if (!failing) {
    console.log(
      `[package-preflight] mode=${mode} free-space ok (${checks
        .map((entry) => `${entry.targetPath}: ${formatBytes(entry.availableBytes)}`)
        .join(', ')})`
    );
    return;
  }

  const lines = [
    `[package-preflight] insufficient free space for mode=${mode}.`,
    `required: at least ${minFreeGiBByMode[mode]} GiB free on the packaging volume.`,
    ...checks.map(
      (entry) => `observed: ${entry.targetPath} -> ${formatBytes(entry.availableBytes)} free`
    ),
    'suggested actions:',
    '- delete or move apps/editor/dist/release artifacts',
    '- clear ~/Library/Caches/electron-builder if it is safe to do so',
    '- use `pnpm -C apps/editor run package:dir` when you only need an unpacked app',
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
