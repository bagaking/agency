export type ExplorerCellAttribution = {
  id: string;
  name: string;
  added: number;
  deleted: number;
};

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveExplorerCellAttribution(cells: unknown): ExplorerCellAttribution[] {
  const rawValues =
    cells && typeof cells === 'object' && !Array.isArray(cells)
      ? Object.values(cells as Record<string, unknown>)
      : [];

  return rawValues
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => {
      const id = String(entry.id || '').trim();
      const name = String(entry.name || id || 'Unknown Cell').trim() || 'Unknown Cell';
      return {
        id: id || name,
        name,
        added: normalizeNumber(entry.added),
        deleted: normalizeNumber(entry.deleted),
      };
    })
    .sort((left, right) => right.added + right.deleted - (left.added + left.deleted));
}
