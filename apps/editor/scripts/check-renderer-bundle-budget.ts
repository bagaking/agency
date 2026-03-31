import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

type BudgetResult = {
  files: string[];
  rawBytes: number;
  gzipBytes: number;
};

const DIST_ROOT = path.resolve(__dirname, '../dist/renderer');
const ASSETS_DIR = path.join(DIST_ROOT, 'assets');
const ACCEPTED_BUDGET_PATH = path.resolve(__dirname, './renderer-bundle-budget.accepted.json');

const DEFAULT_BUDGETS = {
  initialJsRawBytes: 1_250_000,
  initialJsGzipBytes: 270_000,
  initialCssRawBytes: 120_000,
  initialCssGzipBytes: 18_000,
  largestInitialChunkRawBytes: 400_000,
  largestInitialChunkGzipBytes: 110_000,
};

const DEFAULT_RATCHET_ALLOWANCES = {
  initialJsRawBytes: 8_000,
  initialJsGzipBytes: 2_000,
  initialCssRawBytes: 1_024,
  initialCssGzipBytes: 512,
  largestInitialChunkRawBytes: 4_000,
  largestInitialChunkGzipBytes: 1_024,
};

type BudgetMetricName = keyof typeof DEFAULT_BUDGETS;

const STATIC_IMPORT_RE =
  /import(?:[^'"`]+from\s*)?["'](\.?\.?\/[^"']+\.(?:js|css))["']/g;
const MAP_DEPS_MANIFEST_RE = /m\.f\|\|\(m\.f=\[([\s\S]*?)\]\)\)/;
const PRELOAD_SITE_RE =
  /import\("([^"]+\.js)"\)(?:[\s\S]{0,600})?__vite__mapDeps\(\[([0-9,\s]+)\]\)/g;

function readBudget(
  name: BudgetMetricName,
  baseline: Partial<Record<BudgetMetricName, number>> = {}
): number {
  const envName = `AGENCY_RENDERER_${name.replace(/[A-Z]/g, (value) => `_${value}`).toUpperCase()}`;
  const rawValue = Number(process.env[envName]);
  if (Number.isFinite(rawValue) && rawValue > 0) {
    return Math.floor(rawValue);
  }
  const ratchetBaseline = Number(baseline[name] || 0);
  if (Number.isFinite(ratchetBaseline) && ratchetBaseline > 0) {
    return ratchetBaseline + DEFAULT_RATCHET_ALLOWANCES[name];
  }
  return DEFAULT_BUDGETS[name];
}

function readBaseline(): Partial<Record<BudgetMetricName, number>> {
  if (!fs.existsSync(ACCEPTED_BUDGET_PATH)) {
    throw new Error(
      `Renderer bundle accepted-state file is missing at ${ACCEPTED_BUDGET_PATH}. Restore the tracked file or set explicit AGENCY_RENDERER_* overrides.`
    );
  }
  try {
    const raw = JSON.parse(fs.readFileSync(ACCEPTED_BUDGET_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object') {
      throw new Error('Baseline JSON must be an object.');
    }
    const baseline: Partial<Record<BudgetMetricName, number>> = {};
    for (const name of Object.keys(DEFAULT_BUDGETS) as BudgetMetricName[]) {
      const value = Number(raw[name]);
      if (Number.isFinite(value) && value > 0) {
        baseline[name] = Math.floor(value);
      }
    }
    const missing = (Object.keys(DEFAULT_BUDGETS) as BudgetMetricName[]).filter(
      (name) => !Number.isFinite(Number(baseline[name]))
    );
    if (missing.length) {
      throw new Error(`Baseline is missing metric(s): ${missing.join(', ')}`);
    }
    return baseline;
  } catch (error) {
    throw new Error(
      `Renderer bundle accepted-state file at ${ACCEPTED_BUDGET_PATH} is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeHtmlAssetPath(value: string): string {
  return value.replace(/^\.\//, '');
}

function resolveRelativeImport(fromRelPath: string, importPath: string): string {
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRelPath), importPath)
  );
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

function formatBytes(value: number): string {
  return `${(value / 1024).toFixed(1)} KiB`;
}

function assertBudget(
  label: string,
  actual: number,
  budget: number,
  failures: string[]
) {
  if (actual <= budget) {
    return;
  }
  failures.push(`${label}: ${formatBytes(actual)} > ${formatBytes(budget)}`);
}

function warnBudget(
  label: string,
  actual: number,
  budget: number,
  warnings: string[]
) {
  if (actual <= budget) {
    return;
  }
  warnings.push(`${label}: ${formatBytes(actual)} > ${formatBytes(budget)}`);
}

function formatDelta(actual: number, baseline?: number): string | null {
  if (!Number.isFinite(Number(baseline))) {
    return null;
  }
  const delta = actual - Number(baseline);
  if (delta === 0) {
    return '0.0 KiB';
  }
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${formatBytes(delta)}`;
}

function main() {
  const htmlPath = path.join(DIST_ROOT, 'index.html');
  if (!fs.existsSync(htmlPath) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      'Renderer build output is missing. Run `pnpm -C apps/editor run build:renderer` first.'
    );
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const entryScriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
  if (!entryScriptMatch?.[1]) {
    throw new Error(
      'Could not find the renderer entry script in dist/renderer/index.html.'
    );
  }

  const appShellChunk = fs
    .readdirSync(ASSETS_DIR)
    .find((fileName) => /^App-.*\.js$/.test(fileName));
  if (!appShellChunk) {
    throw new Error(
      'Could not find the built App shell chunk under dist/renderer/assets.'
    );
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

  collectStaticImports(
    normalizeHtmlAssetPath(entryScriptMatch[1]),
    cssSeen,
    jsSeen,
    initialTargets
  );
  collectStaticImports(
    path.posix.join('assets', appShellChunk),
    cssSeen,
    jsSeen,
    initialTargets
  );

  const initialJs = summarizeFiles(jsSeen);
  const initialCss = summarizeFiles(cssSeen);

  let largestInitialChunk = { relPath: '', rawBytes: 0, gzipBytes: 0 };
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

  const baseline = readBaseline();
  const failures: string[] = [];
  const warnings: string[] = [];
  assertBudget(
    'Initial JS (raw)',
    initialJs.rawBytes,
    readBudget('initialJsRawBytes', baseline),
    failures
  );
  assertBudget(
    'Initial JS (gzip)',
    initialJs.gzipBytes,
    readBudget('initialJsGzipBytes', baseline),
    failures
  );
  assertBudget(
    'Initial CSS (gzip)',
    initialCss.gzipBytes,
    readBudget('initialCssGzipBytes', baseline),
    failures
  );
  warnBudget(
    'Initial CSS (raw)',
    initialCss.rawBytes,
    readBudget('initialCssRawBytes', baseline),
    warnings
  );
  assertBudget(
    'Largest initial JS chunk (raw)',
    largestInitialChunk.rawBytes,
    readBudget('largestInitialChunkRawBytes', baseline),
    failures
  );
  assertBudget(
    'Largest initial JS chunk (gzip)',
    largestInitialChunk.gzipBytes,
    readBudget('largestInitialChunkGzipBytes', baseline),
    failures
  );

  const summary = [
    'Renderer bundle budget summary:',
    `- Entry chunk: ${normalizeHtmlAssetPath(entryScriptMatch[1])}`,
    `- App shell chunk: assets/${appShellChunk}`,
    `- Initial JS: ${formatBytes(initialJs.rawBytes)} raw / ${formatBytes(initialJs.gzipBytes)} gzip`,
    `- Initial CSS: ${formatBytes(initialCss.rawBytes)} raw / ${formatBytes(initialCss.gzipBytes)} gzip`,
    `- Largest initial chunk: ${largestInitialChunk.relPath} (${formatBytes(largestInitialChunk.rawBytes)} raw / ${formatBytes(largestInitialChunk.gzipBytes)} gzip)`,
  ];

  const deltaLines = [
    ['Initial JS (raw)', formatDelta(initialJs.rawBytes, baseline.initialJsRawBytes)],
    ['Initial JS (gzip)', formatDelta(initialJs.gzipBytes, baseline.initialJsGzipBytes)],
    ['Initial CSS (raw)', formatDelta(initialCss.rawBytes, baseline.initialCssRawBytes)],
    ['Initial CSS (gzip)', formatDelta(initialCss.gzipBytes, baseline.initialCssGzipBytes)],
    [
      'Largest initial JS chunk (raw)',
      formatDelta(largestInitialChunk.rawBytes, baseline.largestInitialChunkRawBytes),
    ],
    [
      'Largest initial JS chunk (gzip)',
      formatDelta(largestInitialChunk.gzipBytes, baseline.largestInitialChunkGzipBytes),
    ],
  ].filter(([, delta]) => Boolean(delta));

  if (deltaLines.length) {
    summary.push(
      `- Accepted state: ${path.relative(process.cwd(), ACCEPTED_BUDGET_PATH) || ACCEPTED_BUDGET_PATH}`
    );
    deltaLines.forEach(([label, delta]) => {
      summary.push(`  - ${label}: ${delta}`);
    });
  }

  if (failures.length) {
    throw new Error(
      `${summary.join('\n')}\nBudget exceeded:\n- ${failures.join('\n- ')}`
    );
  }

  console.log(summary.join('\n'));
  if (warnings.length) {
    console.warn(`Renderer bundle budget warnings:\n- ${warnings.join('\n- ')}`);
  }
}

main();
