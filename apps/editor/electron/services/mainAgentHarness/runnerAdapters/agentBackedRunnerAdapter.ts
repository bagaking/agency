const {
  resolveRunnerProviderId,
} = require('../settings') as {
  resolveRunnerProviderId: (input: {
    requestedProviderId?: unknown;
    adapterId?: unknown;
    skillPackId?: unknown;
    settings?: unknown;
  }) => string;
};
const { createRunnerSkillPackRegistry } = require('../skillPacks') as {
  createRunnerSkillPackRegistry: () => RunnerSkillPackRegistry;
};

type HarnessStep = {
  id?: string;
  kind?: string;
  title?: string;
  label?: string;
  capabilityId?: string;
  input?: Record<string, any>;
  skillPackId?: string;
  agent?: {
    providerId?: string;
    strategy?: string;
  } & Record<string, any>;
} & Record<string, any>;

type HarnessRun = {
  runner?: {
    adapterId?: string;
    providerId?: string;
    steps?: HarnessStep[];
  };
  result?: {
    agent?: Record<string, any> | null;
  };
  progress?: {
    outputsByStepId?: Record<string, unknown>;
  };
};

type CapabilityExecutionResult = {
  response?: { data?: any } | null;
  summary?: any;
};

type SkillPack = {
  id: string;
  title?: string;
  providerHints?: {
    defaultProviderId?: string;
  };
  prepare?: (input: {
    run: HarnessRun;
    step: HarnessStep;
    invokeCapability: (payload: Record<string, any>) => Promise<CapabilityExecutionResult>;
    createFailure: RunnerContext['createFailure'];
  }) => Promise<Record<string, any>>;
  buildDeterministicDecision?: (input: {
    run: HarnessRun;
    step: HarnessStep;
    preparedContext: Record<string, any>;
  }) => any;
  shouldUseDeterministicDecision?: (input: {
    run: HarnessRun;
    step: HarnessStep;
    preparedContext: Record<string, any>;
    deterministicDecision: any;
  }) => boolean;
  buildCapabilityCalls?: (input: {
    run: HarnessRun;
    step: HarnessStep;
    preparedContext: Record<string, any>;
    decision: any;
  }) => Array<{ capabilityId: string; title?: string; input?: Record<string, any> }>;
  resolveCapabilityInput?: (input: {
    call: { capabilityId: string; title?: string; input?: Record<string, any> };
    capabilityResults: Array<Record<string, any>>;
    preparedContext: Record<string, any>;
    decision: any;
  }) => Record<string, any>;
  finalize: (input: {
    run: HarnessRun;
    step: HarnessStep;
    preparedContext: Record<string, any>;
    decision: any;
    capabilityResults: Array<Record<string, any>>;
    providerDecision: any;
  }) => Record<string, any>;
};

type RunnerSkillPackRegistry = {
  resolve: (step?: HarnessStep) => SkillPack | null;
};

type ProviderRegistry = {
  get?: (providerId: string) => {
    decideStep: (input: {
      run: HarnessRun;
      step: HarnessStep;
      skillPack: SkillPack;
      preparedContext: Record<string, any>;
      abortSignal: AbortSignal | null | undefined;
    }) => Promise<any>;
  } | undefined;
};

type RunnerContext = {
  abortSignal?: AbortSignal | null;
  getRun: () => Promise<HarnessRun>;
  createFailure: (code: string, message: string, detail?: Record<string, any>) => Error;
  isStepCompleted: (stepId: string) => boolean;
  stepStarted: (step: HarnessStep, detail: Record<string, any>) => Promise<void>;
  stepCompleted: (step: HarnessStep, output: Record<string, any>) => Promise<void>;
  stepFailed: (step: HarnessStep, error: unknown) => Promise<void>;
  invokeCapability: (payload: Record<string, any>) => Promise<CapabilityExecutionResult>;
};

function normalizeStepKind(value: unknown): 'create_agent' | 'agent_task' | 'capability_call' {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'create_agent') {
    return 'create_agent';
  }
  if (normalized === 'agent_task') {
    return 'agent_task';
  }
  return 'capability_call';
}

function normalizeCapabilityId(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function createAgentBackedRunnerAdapter({
  providerRegistry,
  skillPacks = createRunnerSkillPackRegistry(),
  settings,
}: {
  providerRegistry?: ProviderRegistry;
  skillPacks?: RunnerSkillPackRegistry;
  settings?: unknown;
} = {}) {
  return {
    id: 'agent_backed',
    title: 'Agent-Backed Harness Runner',
    async execute(ctx: RunnerContext) {
      const run = await ctx.getRun();
      const steps = Array.isArray(run?.runner?.steps) ? run.runner.steps : [];
      if (!steps.length) {
        throw ctx.createFailure('INVALID_RUNNER', 'Agent-backed runner requires at least one step.');
      }

      let primaryAgentResult: Record<string, any> | null = run?.result?.agent || null;
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
          adapterId: 'agent_backed',
        });

        try {
          let output: Record<string, any> | null = null;
          if (stepKind === 'create_agent' || stepKind === 'agent_task') {
            const skillPack = skillPacks.resolve(step);
            if (!skillPack) {
              throw ctx.createFailure(
                'SKILL_PACK_NOT_FOUND',
                `No runner skill pack is available for step: ${stepId}.`
              );
            }
            const preparedContext = typeof skillPack.prepare === 'function'
              ? await skillPack.prepare({
                  run,
                  step,
                  invokeCapability: (payload) => ctx.invokeCapability(payload),
                  createFailure: ctx.createFailure,
                })
              : {};
            const explicitProviderId =
              step?.agent?.providerId || run?.runner?.providerId || '';
            let decision: any = null;
            let providerDecision: any = null;
            const deterministicDecision =
              typeof skillPack.buildDeterministicDecision === 'function'
                ? skillPack.buildDeterministicDecision({
                    run,
                    step,
                    preparedContext,
                  })
                : null;
            const shouldUseDeterministicDecision =
              typeof skillPack.shouldUseDeterministicDecision === 'function'
                ? Boolean(
                    skillPack.shouldUseDeterministicDecision({
                      run,
                      step,
                      preparedContext,
                      deterministicDecision,
                    })
                  )
                : false;
            const hintedProviderId =
              explicitProviderId ||
              skillPack?.providerHints?.defaultProviderId ||
              '';
            if (shouldUseDeterministicDecision && deterministicDecision) {
              decision = deterministicDecision;
            } else if (hintedProviderId) {
              const providerId = resolveRunnerProviderId({
                requestedProviderId: hintedProviderId,
                adapterId: run?.runner?.adapterId,
                skillPackId: skillPack.id,
                settings,
              });
              const provider = providerRegistry?.get(providerId);
              if (!provider) {
                throw ctx.createFailure(
                  'PROVIDER_NOT_FOUND',
                  `Harness runner provider is not registered: ${providerId || 'unknown'}.`
                );
              }
              providerDecision = await provider.decideStep({
                run,
                step,
                skillPack,
                preparedContext,
                abortSignal: ctx.abortSignal,
              });
              decision = providerDecision?.decision || null;
            } else if (deterministicDecision) {
              decision = deterministicDecision;
            }

            if (!decision) {
              throw ctx.createFailure(
                'INVALID_PROVIDER_DECISION',
                `No execution decision was produced for skill pack: ${skillPack.id}.`
              );
            }

            const capabilityResults: Array<Record<string, any>> = [];
            const plannedCalls = typeof skillPack.buildCapabilityCalls === 'function'
              ? skillPack.buildCapabilityCalls({
                  run,
                  step,
                  preparedContext,
                  decision,
                })
              : [];
            for (const call of plannedCalls) {
              const input =
                typeof skillPack.resolveCapabilityInput === 'function'
                  ? skillPack.resolveCapabilityInput({
                      call,
                      capabilityResults,
                      preparedContext,
                      decision,
                    })
                  : call.input;
              const result = await ctx.invokeCapability({
                step,
                capabilityId: call.capabilityId,
                title: call.title || call.capabilityId,
                input,
              });
              capabilityResults.push({
                capabilityId: call.capabilityId,
                title: call.title || call.capabilityId,
                input,
                response: result?.response || null,
                summary: result?.summary || null,
              });
            }

            output = skillPack.finalize({
              run,
              step,
              preparedContext,
              decision,
              capabilityResults,
              providerDecision,
            });
            if (stepKind === 'create_agent' && output?.session?.id) {
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
        adapterId: 'agent_backed',
        agent: primaryAgentResult,
        stepOutputs: latestRun?.progress?.outputsByStepId || {},
      };
    },
  };
}
