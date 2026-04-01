export const EXPLORER_HEADER_INLINE_MIN_WIDTH = 440;

export function resolveExplorerHeaderLayout(width: number | null | undefined): 'inline' | 'stacked' {
  if (!Number.isFinite(width) || Number(width) <= 0) {
    return 'inline';
  }
  return Number(width) < EXPLORER_HEADER_INLINE_MIN_WIDTH ? 'stacked' : 'inline';
}
