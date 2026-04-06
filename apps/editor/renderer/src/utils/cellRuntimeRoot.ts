export function resolveCellRuntimeRootPath(cell: any): string {
  if (!cell || typeof cell !== 'object') {
    return '';
  }
  const attachedWorktreePath = String(cell?.attachedWorktreePath || '').trim();
  if (attachedWorktreePath) {
    return attachedWorktreePath;
  }
  const attachmentState = String(cell?.attachmentState || '').trim().toLowerCase();
  if (attachmentState === 'project_root') {
    return String(cell?.projectRoot || cell?.repoRoot || '').trim();
  }
  return String(cell?.worktreePath || '').trim();
}

export function canCellStartRuntime(cell: any): boolean {
  return Boolean(resolveCellRuntimeRootPath(cell));
}
