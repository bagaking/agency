import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export type BudgetResult = {
  files: string[];
  rawBytes: number;
  gzipBytes: number;
};

export const DIST_ROOT = path.resolve(__dirname, '../dist/renderer');
export const ASSETS_DIR = path.join(DIST_ROOT, 'assets');
export const ACCEPTED_BUDGET_PATH = path.resolve(
  __dirname,
  './renderer-bundle-budget.accepted.json'
);
export const ACCEPTED_BUDGET_SCHEMA = 'agency.renderer-bundle-accepted/v1';

export const BUDGET_METRIC_ALLOWANCES = {
  initialJsRawBytes: 8_000,
  initialJsGzipBytes: 2_000,
  initialCssRawBytes: 1_024,
  initialCssGzipBytes: 512,
  largestInitialChunkRawBytes: 4_000,
  largestInitialChunkGzipBytes: 1_024,
} as const;

export type BudgetMetricName = keyof typeof BUDGET_METRIC_ALLOWANCES;

export type BudgetMetrics = Record<BudgetMetricName, number>;

export type AcceptedBudgetSnapshot = {
  schema: string;
  capturedAt: string;
  sourceCommand: string;
  notes: string;
  metrics: BudgetMetrics;
};

export type LargestInitialChunk = {
  relPath: string;
  rawBytes: number;
  gzipBytes: number;
};

export type MeasuredBundle = {
  entryChunk: string;
  appShellChunk: string;
  initialJs: BudgetResult;
  initialCss: BudgetResult;
  largestInitialChunk: LargestInitialChunk;
  metrics: BudgetMetrics;
};

const STATIC_IMPORT_RE =
  /import(?:[^'"`]+from\s*)?["'](\.?\.?\/[^"']+\.(?:js|css))["']/g;
const MAP_DEPS_MANIFEST_RE = /m\.f\|\|\(m\.f=\[([\s\S]*?)\]\)\)/;
const PRELOAD_SITE_RE =
  /import\("([^"]+\.js)"\)(?:[\s\S]{0,600})?__vite__mapDeps\(\[([0-9,\s]+)\]\)/g;

export function formatBytes(value: number): string {
  return `${(value / 1024).toFixed(1)} KiB`;
}

function normalizeHtmlAssetPath(value: string): string {
  return value.replace(/^\.\//, '');
}

function resolveRelativeImport(fromRelPath: string, importPath: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRelPath), importPath));
}

function summarizeFiles(files: Iterable<string>): BudgetResult {
  const resolvedFiles = [...files].sort();
  let rawBytes = 0;
  let gzipBytes = 0;

  for (const relPath of resolvedFiles) {
    const content = fs.readFileSync(path.join(DIST_ROOT, relPath));
    rawBytes += content.length;
    gzipBytes += gzipSync(content).length;
  }

  return {
    files: resolvedFiles,
    rawBytes,
    gzipBytes,
  };
}

function collectPreloadDependencies(
  entryRelPath: string,
  source: string,
  cssSeen: Set<string>,
  jsSeen: Set<string>,
  initialTargets: Set<string>
) {
  const manifestMatch = source.match(MAP_DEPS_MANIFEST_RE);
  if (!manifestMatch?.[1]) {
    return;
  }
  const manifest = [...manifestMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (!manifest.length) {
    return;
  }

  for (const match of source.matchAll(PRELOAD_SITE_RE)) {
    const importedChunk = resolveRelativeImport(entryRelPath, match[1]);
    if (!initialTargets.has(importedChunk) && !jsSeen.has(importedChunk)) {
      continue;
    }

    const indices = match[2]
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < manifest.length);

    for (const index of indices) {
      const dependency = resolveRelativeImport(entryRelPath, manifest[index]);
      if (dependency.endsWith('.css')) {
        cssSeen.add(dependency);
        continue;
      }
      collectStaticImports(dependency, cssSeen, jsSeen, initialTargets);
    }
  }
}

function collectStaticImports(
  entryRelPath: string,
  cssSeen: Set<string>,
  jsSeen: Set<string>,
  initialTargets: Set<string>
) {
  if (jsSeen.has(entryRelPath)) {
    return;
  }
  jsSeen.add(entryRelPath);
  const absolutePath = path.join(DIST_ROOT, entryRelPath);
  const source = fs.readFileSync(absolutePath, 'utf8');

  for (const match of source.matchAll(STATIC_IMPORT_RE)) {
    const relativeImport = resolveRelativeImport(entryRelPath, match[1]);
    if (relativeImport.endsWith('.css')) {
      cssSeen.add(relativeImport);
      continue;
    }
    collectStaticImports(relativeImport, cssSeen, jsSeen, initialTargets);
  }

  collectPreloadDependencies(entryRelPath, source, cssSeen, jsSeen, initialTargets);
}

export function measureCurrentBundle(): MeasuredBundle {
  const htmlPath = path.join(DIST_ROOT, 'index.html');
  if (!fs.existsSync(htmlPath) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      'Renderer build output is missing. Run `pnpm -C apps/editor run build:renderer` first.'
    );
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const entryScriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
  if (!entryScriptMatch?.[1]) {
    throw new Error('Could not find the renderer entry script in dist/renderer/index.html.');
  }

  const appShellChunk = fs
    .readdirSync(ASSETS_DIR)
    .find((fileName) => /^App-.*\.js$/.test(fileName));
  if (!appShellChunk) {
    throw new Error('Could not find the built App shell chunk under dist/renderer/assets.');
  }

  const cssSeen = new Set<string>();
  const jsSeen = new Set<string>();
  const initialTargets = new Set<string>([
    normalizeHtmlAssetPath(entryScriptMatch[1]),
    path.posix.join('assets', appShellChunk),
  ]);

  for (const match of html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)) {
    cssSeen.add(normalizeHtmlAssetPath(match[1]));
  }

  collectStaticImports(normalizeHtmlAssetPath(entryScriptMatch[1]), cssSeen, jsSeen, initialTargets);
  collectStaticImports(path.posix.join('assets', appShellChunk), cssSeen, jsSeen, initialTargets);

  const initialJs = summarizeFiles(jsSeen);
  const initialCss = summarizeFiles(cssSeen);

  let largestInitialChunk: LargestInitialChunk = { relPath: '', rawBytes: 0, gzipBytes: 0 };
  for (const relPath of initialJs.files) {
    const content = fs.readFileSync(path.join(DIST_ROOT, relPath));
    const rawBytes = content.length;
    if (rawBytes <= largestInitialChunk.rawBytes) {
      continue;
    }
    largestInitialChunk = {
      relPath,
      rawBytes,
      gzipBytes: gzipSync(content).length,
    };
  }

  return {
    entryChunk: normalizeHtmlAssetPath(entryScriptMatch[1]),
    appShellChunk: `assets/${appShellChunk}`,
    initialJs,
    initialCss,
    largestInitialChunk,
    metrics: {
      initialJsRawBytes: initialJs.rawBytes,
      initialJsGzipBytes: initialJs.gzipBytes,
      initialCssRawBytes: initialCss.rawBytes,
      initialCssGzipBytes: initialCss.gzipBytes,
      largestInitialChunkRawBytes: largestInitialChunk.rawBytes,
      largestInitialChunkGzipBytes: largestInitialChunk.gzipBytes,
    },
  };
}

export function readAcceptedBudget(): AcceptedBudgetSnapshot {
  if (!fs.existsSync(ACCEPTED_BUDGET_PATH)) {
    throw new Error(
      `Renderer bundle accepted-state file is missing at ${ACCEPTED_BUDGET_PATH}. Restore the tracked file before running budget enforcement.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(ACCEPTED_BUDGET_PATH, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Renderer bundle accepted-state file at ${ACCEPTED_BUDGET_PATH} is invalid.`);
  }
  if (raw.schema !== ACCEPTED_BUDGET_SCHEMA) {
    throw new Error(
      `Renderer bundle accepted-state file at ${ACCEPTED_BUDGET_PATH} has schema ${String(raw.schema || '')}, expected ${ACCEPTED_BUDGET_SCHEMA}.`
    );
  }
  const metrics = {} as BudgetMetrics;
    for (const name of Object.keys(BUDGET_METRIC_ALLOWANCES) as BudgetMetricName[]) {
    const value = Number(raw?.metrics?.[name]);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Accepted-state file is missing metric ${name}.`);
    }
    metrics[name] = Math.floor(value);
  }
  return {
    schema: raw.schema,
    capturedAt: String(raw.capturedAt || '').trim(),
    sourceCommand: String(raw.sourceCommand || '').trim(),
    notes: String(raw.notes || '').trim(),
    metrics,
  };
}

export function writeAcceptedBudget({
  metrics,
  sourceCommand,
  capturedAt = new Date().toISOString(),
}: {
  metrics: BudgetMetrics;
  sourceCommand: string;
  capturedAt?: string;
}): void {
  const payload: AcceptedBudgetSnapshot = {
    schema: ACCEPTED_BUDGET_SCHEMA,
    capturedAt,
    sourceCommand,
    notes:
      'Refresh this accepted-state file only after intentionally approving renderer boot bundle growth or shrinkage.',
    metrics,
  };
  fs.writeFileSync(`${ACCEPTED_BUDGET_PATH}`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
