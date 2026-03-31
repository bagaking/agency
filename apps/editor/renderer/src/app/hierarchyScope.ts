import type { ScopedConfigScope } from './appLayoutContracts';

type ScopeAvailability = {
  canUseProjectScope?: boolean;
  canUseAgentScope?: boolean;
};

export function resolveAvailableHierarchyScope(
  scope: ScopedConfigScope | undefined,
  { canUseProjectScope, canUseAgentScope }: ScopeAvailability
): ScopedConfigScope {
  if (scope === 'agent' && canUseAgentScope) {
    return 'agent';
  }
  if (scope === 'project' && canUseProjectScope) {
    return 'project';
  }
  if (scope === 'agent' || scope === 'project') {
    return canUseProjectScope ? 'project' : 'global';
  }
  return 'global';
}
