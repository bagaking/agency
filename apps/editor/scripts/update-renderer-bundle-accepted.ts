import {
  ACCEPTED_BUDGET_PATH,
  measureCurrentBundle,
  writeAcceptedBudget,
} from './rendererBundleBudgetShared';

function main() {
  const measured = measureCurrentBundle();
  writeAcceptedBudget({
    metrics: measured.metrics,
    sourceCommand: 'pnpm -C apps/editor run accept:renderer-bundle-budget',
  });
  console.log(`Updated renderer bundle accepted state at ${ACCEPTED_BUDGET_PATH}`);
}

main();
