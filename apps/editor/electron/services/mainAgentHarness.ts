// @ts-nocheck
const { logRuntime } = require('./runtimeLog');
const { createHarnessController } = require('./mainAgentHarness/controller');

const controller = createHarnessController({
  logRuntime,
});

function buildSuccess(action, data = null, warnings = []) {
  return {
    success: true,
    action,
    warnings: Array.isArray(warnings) ? warnings : [],
    failures: [],
    data,
  };
}

function buildFailure(action, code, message, data = null) {
  return {
    success: false,
    action,
    warnings: [],
    failures: [
      {
        code: String(code || 'FATAL'),
        message: String(message || 'Main Agent Harness action failed.'),
      },
    ],
    data,
  };
}

async function runHarnessAction(action, executor) {
  try {
    const data = await executor();
    return buildSuccess(action, data);
  } catch (error) {
    return buildFailure(
      action,
      error?.code || 'FATAL',
      error?.message || String(error),
      error?.data || null
    );
  }
}

async function startMainAgentHarnessRun(payload = {}, context = {}) {
  return runHarnessAction('start', () => controller.startRun(payload || {}, context));
}

async function inspectMainAgentHarnessRun(payload = {}, context = {}) {
  return runHarnessAction('inspect', () => controller.inspectRun(payload || {}, context));
}

async function cancelMainAgentHarnessRun(payload = {}, context = {}) {
  return runHarnessAction('cancel', () => controller.cancelRun(payload || {}, context));
}

async function resumeMainAgentHarnessRun(payload = {}, context = {}) {
  return runHarnessAction('resume', () => controller.resumeRun(payload || {}, context));
}

async function listMainAgentHarnessRuns(payload = {}, context = {}) {
  return runHarnessAction('list', () => controller.listRuns(payload || {}, context));
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
