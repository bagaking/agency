// @ts-nocheck
const { logRuntime } = require('./runtimeLog');
const { createHarnessController } = require('./mainAgentHarness/controller');

const controller = createHarnessController({
  logRuntime,
});

async function startMainAgentHarnessRun(payload = {}) {
  return controller.startRun(payload || {});
}

async function inspectMainAgentHarnessRun(payload = {}) {
  return controller.inspectRun(payload || {});
}

async function cancelMainAgentHarnessRun(payload = {}) {
  return controller.cancelRun(payload || {});
}

async function resumeMainAgentHarnessRun(payload = {}) {
  return controller.resumeRun(payload || {});
}

async function listMainAgentHarnessRuns(payload = {}) {
  return controller.listRuns(payload || {});
}

function onMainAgentHarnessProgress(handler) {
  return controller.onProgress(handler);
}

module.exports = {
  startMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
  cancelMainAgentHarnessRun,
  resumeMainAgentHarnessRun,
  listMainAgentHarnessRuns,
  onMainAgentHarnessProgress,
};
