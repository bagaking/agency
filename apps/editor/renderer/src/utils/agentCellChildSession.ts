import { BASELINE_PROFILE_ID } from './terminusSettings';

export type AgentCellChildSessionKind = 'sub_terminal' | 'fork';

export function buildAgentCellChildSessionOptions({
  parentSession,
  nodeKind,
}: {
  parentSession: Record<string, any> | null | undefined;
  nodeKind: AgentCellChildSessionKind;
}) {
  const sessionId = String(parentSession?.id || '').trim();
  if (!sessionId) {
    throw new Error('parentSession.id is required.');
  }

  const inheritedProfileId = String(parentSession?.profileId || '').trim();
  const profileId =
    nodeKind === 'sub_terminal'
      ? BASELINE_PROFILE_ID
      : inheritedProfileId || BASELINE_PROFILE_ID;

  return {
    profileId,
    parentSessionId: sessionId,
    nodeKind,
    sourceSessionId: sessionId,
    ...(nodeKind === 'fork' ? { smartFork: true } : {}),
  };
}
