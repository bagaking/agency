import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const fsp = fs.promises;

export async function readYamlFile<T>(
  filePath: string,
  fallback: T,
  options: { backupCorrupt?: boolean } = {}
): Promise<T> {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = await fsp.readFile(filePath, 'utf-8');
    return ((yaml.load(raw) || fallback) as T) ?? fallback;
  } catch (_error) {
    if (options.backupCorrupt) {
      const suffix = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.corrupt-${suffix}`;
      try {
        await fsp.rename(filePath, backupPath);
      } catch (_renameError) {
        // best effort only
      }
    }
    return fallback;
  }
}

export async function writeYamlFileAtomic(filePath: string, payload: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const content = yaml.dump(payload, { lineWidth: 120 });
  const tempSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tempPath = `${filePath}.tmp-${tempSuffix}`;
  await fsp.writeFile(tempPath, content, 'utf-8');
  await fsp.rename(tempPath, filePath);
}
