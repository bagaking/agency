import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = path.join(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');

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

function main(): void {
  if (!fs.existsSync(distRoot)) {
    console.log('[package-clean] nothing to remove');
    return;
  }

  const reclaimedBytes = getPathSizeBytes(distRoot);
  fs.rmSync(distRoot, { recursive: true, force: true });
  console.log(
    `[package-clean] removed ${path.relative(projectRoot, distRoot) || 'dist'} (${formatBytes(reclaimedBytes)})`
  );
}

main();
