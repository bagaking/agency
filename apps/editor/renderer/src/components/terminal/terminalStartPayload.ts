export function buildTerminalStartPayload({
  cell,
  sessionId,
  worktreePath,
  mode,
}: {
  cell?: any;
  sessionId?: string;
  worktreePath?: string;
  mode?: string;
}) {
  return {
    cellId: cell?.id,
    sessionId,
    worktreePath,
    projectRoot: String(cell?.projectRoot || cell?.repoRoot || '').trim(),
    mode,
  };
}
