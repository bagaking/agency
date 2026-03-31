import path from 'node:path';
import {
  ACCEPTED_BUDGET_PATH,
  BUDGET_METRIC_ALLOWANCES,
  type BudgetMetricName,
  type BudgetMetrics,
  formatBytes,
  measureCurrentBundle,
  readAcceptedBudget,
} from './rendererBundleBudgetShared';

function readBudget(name: BudgetMetricName, acceptedMetrics: BudgetMetrics): number {
  const allowOverride = process.env.AGENCY_RENDERER_ALLOW_OVERRIDE === '1';
  if (allowOverride) {
    const envName = `AGENCY_RENDERER_${name.replace(/[A-Z]/g, (value) => `_${value}`).toUpperCase()}`;
    const rawValue = Number(process.env[envName]);
    if (Number.isFinite(rawValue) && rawValue > 0) {
      return Math.floor(rawValue);
    }
  }
  return acceptedMetrics[name] + BUDGET_METRIC_ALLOWANCES[name];
}

function assertBudget(label: string, actual: number, budget: number, failures: string[]) {
  if (actual <= budget) {
    return;
  }
  failures.push(`${label}: ${formatBytes(actual)} > ${formatBytes(budget)}`);
}

function warnBudget(label: string, actual: number, budget: number, warnings: string[]) {
  if (actual <= budget) {
    return;
  }
  warnings.push(`${label}: ${formatBytes(actual)} > ${formatBytes(budget)}`);
}

function formatDelta(actual: number, accepted: number): string {
  const delta = actual - accepted;
  if (delta === 0) {
    return '0.0 KiB';
  }
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${formatBytes(delta)}`;
}

function main() {
  const measured = measureCurrentBundle();
  const accepted = readAcceptedBudget();
  const failures: string[] = [];
  const warnings: string[] = [];

  assertBudget(
    'Initial JS (raw)',
    measured.metrics.initialJsRawBytes,
    readBudget('initialJsRawBytes', accepted.metrics),
    failures
  );
  assertBudget(
    'Initial JS (gzip)',
    measured.metrics.initialJsGzipBytes,
    readBudget('initialJsGzipBytes', accepted.metrics),
    failures
  );
  assertBudget(
    'Initial CSS (gzip)',
    measured.metrics.initialCssGzipBytes,
    readBudget('initialCssGzipBytes', accepted.metrics),
    failures
  );
  warnBudget(
    'Initial CSS (raw)',
    measured.metrics.initialCssRawBytes,
    readBudget('initialCssRawBytes', accepted.metrics),
    warnings
  );
  assertBudget(
    'Largest initial JS chunk (raw)',
    measured.metrics.largestInitialChunkRawBytes,
    readBudget('largestInitialChunkRawBytes', accepted.metrics),
    failures
  );
  assertBudget(
    'Largest initial JS chunk (gzip)',
    measured.metrics.largestInitialChunkGzipBytes,
    readBudget('largestInitialChunkGzipBytes', accepted.metrics),
    failures
  );

  const summary = [
    'Renderer bundle budget summary:',
    `- Entry chunk: ${measured.entryChunk}`,
    `- App shell chunk: ${measured.appShellChunk}`,
    `- Initial JS: ${formatBytes(measured.initialJs.rawBytes)} raw / ${formatBytes(measured.initialJs.gzipBytes)} gzip`,
    `- Initial CSS: ${formatBytes(measured.initialCss.rawBytes)} raw / ${formatBytes(measured.initialCss.gzipBytes)} gzip`,
    `- Largest initial chunk: ${measured.largestInitialChunk.relPath} (${formatBytes(measured.largestInitialChunk.rawBytes)} raw / ${formatBytes(measured.largestInitialChunk.gzipBytes)} gzip)`,
    `- Accepted state: ${path.relative(process.cwd(), ACCEPTED_BUDGET_PATH) || ACCEPTED_BUDGET_PATH}`,
    `  - Initial JS (raw): ${formatDelta(measured.metrics.initialJsRawBytes, accepted.metrics.initialJsRawBytes)}`,
    `  - Initial JS (gzip): ${formatDelta(measured.metrics.initialJsGzipBytes, accepted.metrics.initialJsGzipBytes)}`,
    `  - Initial CSS (raw): ${formatDelta(measured.metrics.initialCssRawBytes, accepted.metrics.initialCssRawBytes)}`,
    `  - Initial CSS (gzip): ${formatDelta(measured.metrics.initialCssGzipBytes, accepted.metrics.initialCssGzipBytes)}`,
    `  - Largest initial JS chunk (raw): ${formatDelta(measured.metrics.largestInitialChunkRawBytes, accepted.metrics.largestInitialChunkRawBytes)}`,
    `  - Largest initial JS chunk (gzip): ${formatDelta(measured.metrics.largestInitialChunkGzipBytes, accepted.metrics.largestInitialChunkGzipBytes)}`,
  ];

  if (failures.length) {
    throw new Error(`${summary.join('\n')}\nBudget exceeded:\n- ${failures.join('\n- ')}`);
  }

  console.log(summary.join('\n'));
  if (warnings.length) {
    console.warn(`Renderer bundle budget warnings:\n- ${warnings.join('\n- ')}`);
  }
}

main();
