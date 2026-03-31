import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assessElectronDistIntegrity,
  cleanupStagedElectronDist,
  estimateConfiguredElectronDistStageBytes,
  resolveConfiguredElectronDist,
  resolveStagedElectronDistPath,
  stageConfiguredElectronDist,
  type ElectronDistMetadata,
  validateConfiguredElectronDist,
} from '../packagingPreflightShared';

test('assessElectronDistIntegrity accepts a pristine default Electron skeleton', () => {
  const metadata: ElectronDistMetadata = {
    mainExecutable: 'Electron',
    mainBundleName: 'Electron',
    helperBundleName: 'Electron Helper',
  };

  assert.deepEqual(assessElectronDistIntegrity('Electron', metadata), []);
});

test('assessElectronDistIntegrity flags mutated main bundle metadata', () => {
  const metadata: ElectronDistMetadata = {
    mainExecutable: 'Agency',
    mainBundleName: 'Agency',
    helperBundleName: 'Electron Helper',
  };

  assert.deepEqual(assessElectronDistIntegrity('Electron', metadata), [
    'main CFBundleExecutable is "Agency"; expected "Electron"',
    'main CFBundleName is "Agency"; expected "Electron"',
  ]);
});

test('assessElectronDistIntegrity flags a missing helper plist', () => {
  const metadata: ElectronDistMetadata = {
    mainExecutable: 'Electron',
    mainBundleName: 'Electron',
    helperBundleName: null,
  };

  assert.deepEqual(assessElectronDistIntegrity('Electron', metadata), [
    'generic helper Info.plist is missing',
  ]);
});

function writeFixturePackage(projectRoot: string, electronDistRelativePath: string) {
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'agency-editor-fixture',
        private: true,
        build: {
          electronDist: electronDistRelativePath,
        },
      },
      null,
      2
    ),
    'utf8'
  );
}

function writeFixtureElectronDist(projectRoot: string, metadata: ElectronDistMetadata) {
  const electronDistPath = path.join(projectRoot, 'fixture-electron-dist');
  const mainPlistPath = path.join(
    electronDistPath,
    'Electron.app',
    'Contents',
    'Info.plist'
  );
  const helperPlistPath = path.join(
    electronDistPath,
    'Electron.app',
    'Contents',
    'Frameworks',
    'Electron Helper.app',
    'Contents',
    'Info.plist'
  );
  const executablePath = path.join(
    electronDistPath,
    'Electron.app',
    'Contents',
    'MacOS',
    'Electron'
  );
  fs.mkdirSync(path.dirname(mainPlistPath), { recursive: true });
  fs.mkdirSync(path.dirname(helperPlistPath), { recursive: true });
  fs.mkdirSync(path.dirname(executablePath), { recursive: true });
  const plist = (bundleName: string | null, executable: string | null) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  ${bundleName == null ? '' : `<key>CFBundleName</key><string>${bundleName}</string>`}
  ${executable == null ? '' : `<key>CFBundleExecutable</key><string>${executable}</string>`}
</dict>
</plist>
`;
  fs.writeFileSync(
    mainPlistPath,
    plist(metadata.mainBundleName, metadata.mainExecutable),
    'utf8'
  );
  if (metadata.helperBundleName != null) {
    fs.writeFileSync(helperPlistPath, plist(metadata.helperBundleName, null), 'utf8');
  }
  fs.writeFileSync(executablePath, '#!/bin/sh\nexit 0\n', 'utf8');
  return electronDistPath;
}

test('validateConfiguredElectronDist reports a mutated skeleton with remediation guidance', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-packaging-shared-'));
  try {
    writeFixturePackage(projectRoot, './fixture-electron-dist');
    writeFixtureElectronDist(projectRoot, {
      mainExecutable: 'Agency',
      mainBundleName: 'Agency',
      helperBundleName: 'Electron Helper',
    });

    assert.throws(
      () => validateConfiguredElectronDist(projectRoot, 'pnpm run package'),
      /configured electronDist looks mutated[\s\S]*pnpm install --force[\s\S]*pnpm run package/
    );
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('stageConfiguredElectronDist copies the configured dist and cleanupStagedElectronDist removes it', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-packaging-stage-'));
  try {
    writeFixturePackage(projectRoot, './fixture-electron-dist');
    const electronDistPath = writeFixtureElectronDist(projectRoot, {
      mainExecutable: 'Electron',
      mainBundleName: 'Electron',
      helperBundleName: 'Electron Helper',
    });
    const stageEstimate = estimateConfiguredElectronDistStageBytes(projectRoot);
    assert.ok(stageEstimate > 0);
    assert.equal(resolveConfiguredElectronDist(projectRoot), electronDistPath);

    const stagedPath = stageConfiguredElectronDist(projectRoot);
    assert.equal(stagedPath, resolveStagedElectronDistPath(projectRoot));
    assert.equal(fs.existsSync(stagedPath || ''), true);
    assert.equal(
      fs.existsSync(path.join(stagedPath || '', 'Electron.app', 'Contents', 'Info.plist')),
      true
    );

    cleanupStagedElectronDist(projectRoot);
    assert.equal(fs.existsSync(resolveStagedElectronDistPath(projectRoot)), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
