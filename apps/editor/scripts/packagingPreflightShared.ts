import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

type PackageBuildConfig = {
  electronBrandingProductName: string;
  electronDist: string | null;
};

export type ElectronDistMetadata = {
  helperBundleName: string | null;
  mainBundleName: string | null;
  mainExecutable: string | null;
};

const STAGED_ELECTRON_DIST_DIRNAME = '.electron-dist-stage';

function readPackageBuildConfig(projectRoot: string): PackageBuildConfig {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const raw = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const build = raw?.build && typeof raw.build === 'object' ? raw.build : {};
  const electronBranding =
    build?.electronBranding && typeof build.electronBranding === 'object'
      ? build.electronBranding
      : {};
  const electronBrandingProductName = String(electronBranding.productName || '').trim() || 'Electron';
  const electronDist = String(build.electronDist || '').trim() || null;
  return {
    electronBrandingProductName,
    electronDist,
  };
}

export function resolveConfiguredElectronDist(projectRoot: string): string | null {
  const config = readPackageBuildConfig(projectRoot);
  if (!config.electronDist) {
    return null;
  }
  return path.isAbsolute(config.electronDist)
    ? config.electronDist
    : path.resolve(projectRoot, config.electronDist);
}

export function resolveStagedElectronDistPath(projectRoot: string): string {
  return path.join(projectRoot, 'dist', STAGED_ELECTRON_DIST_DIRNAME);
}

function getPathSizeBytes(targetPath: string): number {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }
  const output = execFileSync('du', ['-sk', targetPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const dataLine = output.split('\n').filter(Boolean)[0] || '';
  const sizeKib = Number(dataLine.trim().split(/\s+/)[0] || 0);
  return Number.isFinite(sizeKib) && sizeKib > 0 ? sizeKib * 1024 : 0;
}

function readPlistRawString(plistPath: string, key: string): string | null {
  if (!fs.existsSync(plistPath)) {
    return null;
  }
  try {
    const value = execFileSync('plutil', ['-extract', key, 'raw', '-o', '-', plistPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}

function quoteValue(value: string | null): string {
  return value == null ? '(missing)' : `"${value}"`;
}

export function assessElectronDistIntegrity(
  expectedProductName: string,
  metadata: ElectronDistMetadata
): string[] {
  const issues: string[] = [];

  if (metadata.mainExecutable !== expectedProductName) {
    issues.push(
      `main CFBundleExecutable is ${quoteValue(metadata.mainExecutable)}; expected "${expectedProductName}"`
    );
  }
  if (metadata.mainBundleName !== expectedProductName) {
    issues.push(
      `main CFBundleName is ${quoteValue(metadata.mainBundleName)}; expected "${expectedProductName}"`
    );
  }
  if (metadata.helperBundleName == null) {
    issues.push('generic helper Info.plist is missing');
  } else if (!metadata.helperBundleName.startsWith(expectedProductName)) {
    issues.push(
      `generic helper CFBundleName is ${quoteValue(metadata.helperBundleName)}; expected to start with "${expectedProductName}"`
    );
  }

  return issues;
}

export function validateConfiguredElectronDist(
  projectRoot: string,
  retryCommand: string
): void {
  const config = readPackageBuildConfig(projectRoot);
  const resolvedElectronDist = resolveConfiguredElectronDist(projectRoot);
  if (!resolvedElectronDist) {
    return;
  }

  if (!fs.existsSync(resolvedElectronDist)) {
    throw new Error(
      `[package-preflight] configured electronDist does not exist: ${resolvedElectronDist}`
    );
  }

  const sourceAppPath = path.join(
    resolvedElectronDist,
    `${config.electronBrandingProductName}.app`
  );
  const sourceInfoPlistPath = path.join(sourceAppPath, 'Contents', 'Info.plist');
  const sourceHelperInfoPlistPath = path.join(
    sourceAppPath,
    'Contents',
    'Frameworks',
    `${config.electronBrandingProductName} Helper.app`,
    'Contents',
    'Info.plist'
  );

  const metadata: ElectronDistMetadata = {
    mainExecutable: readPlistRawString(sourceInfoPlistPath, 'CFBundleExecutable'),
    mainBundleName: readPlistRawString(sourceInfoPlistPath, 'CFBundleName'),
    helperBundleName: readPlistRawString(sourceHelperInfoPlistPath, 'CFBundleName'),
  };
  const issues = assessElectronDistIntegrity(config.electronBrandingProductName, metadata);

  if (!issues.length) {
    return;
  }

  throw new Error(
    [
      `[package-preflight] configured electronDist looks mutated: ${resolvedElectronDist}`,
      `expected a pristine "${config.electronBrandingProductName}" Electron skeleton before packaging, but found:`,
      ...issues.map((issue) => `- ${issue}`),
      'This usually means the installed Electron distribution under node_modules was modified by a prior local packaging/debug cycle or by a manual edit.',
      `Remediation: run \`cd apps/editor && pnpm install --force\` to restore node_modules/electron/dist, then retry \`${retryCommand}\`.`,
    ].join('\n')
  );
}

export function estimateConfiguredElectronDistStageBytes(projectRoot: string): number {
  const resolvedElectronDist = resolveConfiguredElectronDist(projectRoot);
  if (!resolvedElectronDist) {
    return 0;
  }
  return getPathSizeBytes(resolvedElectronDist);
}

export function stageConfiguredElectronDist(projectRoot: string): string | null {
  const resolvedElectronDist = resolveConfiguredElectronDist(projectRoot);
  if (!resolvedElectronDist) {
    return null;
  }
  const stagedElectronDist = resolveStagedElectronDistPath(projectRoot);
  fs.rmSync(stagedElectronDist, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(stagedElectronDist), { recursive: true });
  execFileSync('/usr/bin/ditto', [resolvedElectronDist, stagedElectronDist], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stagedElectronDist;
}

export function cleanupStagedElectronDist(projectRoot: string): void {
  const stagedElectronDist = resolveStagedElectronDistPath(projectRoot);
  if (!fs.existsSync(stagedElectronDist)) {
    return;
  }
  fs.rmSync(stagedElectronDist, { recursive: true, force: true });
}
