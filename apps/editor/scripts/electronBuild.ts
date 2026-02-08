import { spawn } from "node:child_process";
import path from "node:path";

const buildElectronScriptPath = path.join(__dirname, "build-electron.ts");

type RunElectronBuildOptions = {
  env?: NodeJS.ProcessEnv;
};

function runElectronBuild({ env = process.env }: RunElectronBuildOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", buildElectronScriptPath], {
      stdio: "inherit",
      env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`build-electron exited with code ${code}`));
    });
  });
}

export { runElectronBuild };
