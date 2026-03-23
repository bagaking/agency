// @ts-nocheck
const { createRunnerSkillPackRegistry } = require('../runnerSkillPacks');

function normalizeStepKind(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'create_agent') {
    return 'create_agent';
  }
  return 'capability_call';
}

function normalizeCapabilityId(value) {
  return String(value || '').trim().toLowerCase();
}

function createReferenceRunnerAdapter({ skillPacks = createRunnerSkillPackRegistry() } = {}) {
  return {
    id: 'reference',
    title: 'Reference Harness Runner',
    async execute(ctx) {
      const run = await ctx.getRun();
      const steps = Array.isArray(run?.runner?.steps) ? run.runner.steps : [];
      if (!steps.length) {
        throw ctx.createFailure('INVALID_RUNNER', 'Reference runner requires at least one step.');
      }

      let primaryAgentResult = run?.result?.agent || null;
      for (const rawStep of steps) {
        const step = rawStep && typeof rawStep === 'object' ? rawStep : {};
        const stepId = String(step.id || '').trim();
        if (!stepId) {
          throw ctx.createFailure('INVALID_STEP', 'Each runner step requires a stable id.', {
            step,
          });
        }
        if (ctx.isStepCompleted(stepId)) {
          continue;
        }

        const stepKind = normalizeStepKind(step.kind);
        await ctx.stepStarted(step, {
          kind: stepKind,
          title: step.title || step.label || stepId,
        });
        try {
          let output = null;
          if (stepKind === 'create_agent') {
            const skillPack = skillPacks.resolve(step);
            if (!skillPack) {
              throw ctx.createFailure(
                'SKILL_PACK_NOT_FOUND',
                `No runner skill pack is available for step: ${stepId}.`
              );
            }
            output = await skillPack.execute(ctx, step);
            if (output?.session?.id) {
              primaryAgentResult = {
                session: output.session,
                mode: output.mode || '',
                specialization: output.specialization || null,
                sourceSession: output.sourceSession || null,
                sourceRuntime: output.sourceRuntime || null,
                metadata: output.metadata || null,
                launch: output.launch || null,
              };
            }
          } else {
            const capabilityId = normalizeCapabilityId(step.capabilityId);
            if (!capabilityId) {
              throw ctx.createFailure(
                'INVALID_STEP',
                `Capability step ${stepId} requires capabilityId.`
              );
            }
            const result = await ctx.invokeCapability({
              step,
              capabilityId,
              title: step.title || step.label || capabilityId,
              input: step.input || {},
            });
            output = {
              capabilityId,
              summary: result?.summary || null,
            };
          }

          await ctx.stepCompleted(step, output);
        } catch (error) {
          await ctx.stepFailed(step, error);
          throw error;
        }
      }

      const latestRun = await ctx.getRun();
      return {
        adapterId: 'reference',
        agent: primaryAgentResult,
        stepOutputs: latestRun?.progress?.outputsByStepId || {},
      };
    },
  };
}

module.exports = {
  createReferenceRunnerAdapter,
};
