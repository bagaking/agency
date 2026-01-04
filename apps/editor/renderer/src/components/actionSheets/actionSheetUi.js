export const stateBadge = (state) => {
  if (state === 'running') return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
  if (state === 'waiting_gate') return 'bg-amber-500/10 text-amber-200 border-amber-500/20';
  if (state === 'completed') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (state === 'failed') return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  if (state === 'canceled') return 'bg-muted/10 text-muted-foreground border-border/30';
  return 'bg-muted/10 text-muted-foreground border-border/30';
};

export const gateBadge = (status) => {
  if (status === 'passed') return 'text-emerald-300';
  if (status === 'failed') return 'text-rose-300';
  return 'text-muted-foreground/60';
};

export const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
};

export const resolveActionSheetLabel = (sheet) => sheet?.title || sheet?.id || 'Action Sheet';
