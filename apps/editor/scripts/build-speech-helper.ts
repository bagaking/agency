import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const helperRoot = path.join(root, "electron", "native", "speech-helper");
const helperSource = path.join(helperRoot, "SpeechHelper.swift");
const helperBinDir = path.join(helperRoot, "bin");
const bundleName = "AgencySpeechHelper.app";
const bundleRoot = path.join(helperBinDir, bundleName);
const bundleContents = path.join(bundleRoot, "Contents");
const bundleMacos = path.join(bundleContents, "MacOS");
const helperBin = path.join(bundleMacos, "speech-helper");
const infoPlistSource = path.join(helperRoot, "Info.plist");
const infoPlistTarget = path.join(bundleContents, "Info.plist");

type ExecFileResult = {
  stdout: string;
  stderr: string;
};

type ExecFileError = Error & {
  stdout?: string;
  stderr?: string;
};

if (process.platform !== "darwin") {
  console.log("[speech-helper] skipped (non-macOS)");
  process.exit(0);
}

function execFileAsync(command: string, args: string[]): Promise<ExecFileResult> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        const wrapped = error as ExecFileError;
        wrapped.stdout = stdout;
        wrapped.stderr = stderr;
        reject(wrapped);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function build(): Promise<void> {
  if (!fs.existsSync(helperSource)) {
    throw new Error(`Speech helper source missing at ${helperSource}`);
  }

  await fs.promises.mkdir(bundleMacos, { recursive: true });

  console.log("[speech-helper] building native helper...");
  await execFileAsync("xcrun", [
    "swiftc",
    "-O",
    "-framework",
    "Speech",
    "-framework",
    "AVFoundation",
    "-framework",
    "NaturalLanguage",
    helperSource,
    "-o",
    helperBin,
  ]);

  await fs.promises.chmod(helperBin, 0o755);

  if (!fs.existsSync(infoPlistSource)) {
    throw new Error(`Speech helper Info.plist missing at ${infoPlistSource}`);
  }

  await fs.promises.copyFile(infoPlistSource, infoPlistTarget);
  console.log(`[speech-helper] built: ${helperBin}`);
}

void build().catch((error: ExecFileError) => {
  console.error("[speech-helper] build failed", error.stderr || error.message || error);
  process.exit(1);
});
