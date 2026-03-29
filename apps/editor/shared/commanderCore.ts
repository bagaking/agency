export const COMMANDER_PROVIDER_ID = 'codex_cli';

export const COMMANDER_ACTION_IDS = {
  smartFork: 'smart_fork',
  smartName: 'smart_name',
} as const;

export type CommanderActionId =
  (typeof COMMANDER_ACTION_IDS)[keyof typeof COMMANDER_ACTION_IDS];

type CommanderActionConfig = {
  id: CommanderActionId;
  label: string;
  callerId: string;
  goal: {
    type: string;
    title: string;
    instruction: string;
  };
  runner: {
    stepId: string;
    stepKind: 'create_agent' | 'agent_task';
    stepTitle: string;
    skillPackId: string;
    strategy: string;
    requestedCapabilities: string[];
  };
};

const COMMANDER_ACTION_CONFIGS: Record<CommanderActionId, CommanderActionConfig> = {
  [COMMANDER_ACTION_IDS.smartFork]: {
    id: COMMANDER_ACTION_IDS.smartFork,
    label: 'Smart Fork',
    callerId: 'commander-smart-fork',
    goal: {
      type: 'create_agent',
      title: 'Create Agent via Fork',
      instruction:
        'Create a child execution lane from the selected session using a tool-native fork specialization when available.',
    },
    runner: {
      stepId: 'create-agent',
      stepKind: 'create_agent',
      stepTitle: 'Create Agent from selected session',
      skillPackId: 'session.tool-native-fork',
      strategy: 'tool_native_fork',
      requestedCapabilities: ['session.runtime'],
    },
  },
  [COMMANDER_ACTION_IDS.smartName]: {
    id: COMMANDER_ACTION_IDS.smartName,
    label: 'Smart Name',
    callerId: 'commander-smart-name',
    goal: {
      type: 'suggest_session_name',
      title: 'Suggest Session Name',
      instruction: 'Suggest short session names from recent session context.',
    },
    runner: {
      stepId: 'smart-name',
      stepKind: 'agent_task',
      stepTitle: 'Suggest session name from current context',
      skillPackId: 'session.smart-name',
      strategy: 'smart_name',
      requestedCapabilities: ['session.runtime'],
    },
  },
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

export function getCommanderActionConfig(
  actionId: CommanderActionId
): CommanderActionConfig {
  return COMMANDER_ACTION_CONFIGS[actionId];
}

export function getCommanderCallerId(actionId: CommanderActionId): string {
  return getCommanderActionConfig(actionId)?.callerId || '';
}

export function isHarnessRunActiveStatus(value: unknown): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return (
    normalized === 'queued' ||
    normalized === 'running' ||
    normalized === 'cancelling'
  );
}

export function isHarnessRunResumableStatus(value: unknown): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === 'failed' || normalized === 'cancelled';
}

export function resolveActiveHarnessRun<T extends { status?: unknown }>(
  runs: T[] = []
): T | null {
  const list = Array.isArray(runs) ? runs : [];
  return list.find((run) => isHarnessRunActiveStatus(run?.status)) || null;
}

export function resolvePrimaryHarnessRun<T extends { status?: unknown }>(
  runs: T[] = []
): T | null {
  const list = Array.isArray(runs) ? runs : [];
  return resolveActiveHarnessRun(list) || list[0] || null;
}

export function isCommanderTaskRun(run: any): boolean {
  const callerId = normalizeText(run?.caller?.callerId).toLowerCase();
  return Object.values(COMMANDER_ACTION_CONFIGS).some(
    (config) => config.callerId === callerId
  );
}

export function resolveActiveCommanderRun<T extends { status?: unknown }>(
  runs: T[] = []
): T | null {
  const list = Array.isArray(runs) ? runs : [];
  return (
    list.find(
      (run) => isCommanderTaskRun(run) && isHarnessRunActiveStatus(run?.status)
    ) || null
  );
}

export function resolvePrimaryCommanderRun<T extends { status?: unknown }>(
  runs: T[] = []
): T | null {
  const list = (Array.isArray(runs) ? runs : []).filter((run) =>
    isCommanderTaskRun(run)
  );
  return resolveActiveCommanderRun(list) || list[0] || null;
}

export function resolveCommanderDirectiveLabel(run: any): string {
  return (
    normalizeText(run?.goal?.title) ||
    normalizeText(run?.goal?.type) ||
    normalizeText(run?.runner?.steps?.[0]?.title) ||
    'Awaiting command'
  );
}

export function resolveCommanderProviderLabel(run: any): string {
  return normalizeText(run?.runner?.providerId || 'standby')
    .replace(/_/g, ' ')
    .toUpperCase();
}
