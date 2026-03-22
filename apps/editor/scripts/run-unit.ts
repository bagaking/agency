import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.join(__dirname, '..');
const TEST_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function collectTestFiles(dirPath: string, bucket: string[]): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectTestFiles(absolutePath, bucket);
      return;
    }
    const ext = path.extname(entry.name);
    if (!TEST_EXTENSIONS.has(ext)) {
      return;
    }
    if (!entry.name.includes('.test.')) {
      return;
    }
    bucket.push(path.relative(ROOT_DIR, absolutePath));
  });
}

function collectAllUnitTests(): string[] {
  const testFiles: string[] = [];
  collectTestFiles(path.join(ROOT_DIR, 'electron'), testFiles);
  collectTestFiles(path.join(ROOT_DIR, 'renderer', 'src'), testFiles);
  return testFiles.sort((left, right) => left.localeCompare(right));
}

async function run(): Promise<void> {
  const testFiles = collectAllUnitTests();
  if (!testFiles.length) {
    console.log('No unit tests found.');
    return;
  }

  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(pnpmCommand, ['exec', 'tsx', '--test', ...testFiles], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });

  await new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Unit tests failed with exit code ${code ?? 1}.`));
    });
  });
}

void run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
