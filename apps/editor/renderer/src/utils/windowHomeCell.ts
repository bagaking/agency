type WindowHomeCellLike = {
  ownerKind?: unknown;
  isVirtual?: unknown;
  id?: unknown;
} | null | undefined;

export function isWindowHomeCell(cell: WindowHomeCellLike): boolean {
  if (!cell || typeof cell !== 'object') {
    return false;
  }
  if (String(cell.ownerKind || '').trim() === 'window-home') {
    return true;
  }
  return Boolean(cell.isVirtual) && String(cell.id || '').trim() === 'local-terminal';
}

export function isProjectBackedCell(cell: WindowHomeCellLike): boolean {
  return !isWindowHomeCell(cell);
}
