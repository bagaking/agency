export const fileStatusColors: Record<string, string> = {
  added: 'text-emerald-300',
  modified: 'text-amber-200',
  deleted: 'text-rose-300',
  renamed: 'text-sky-200',
  copied: 'text-sky-200',
  untracked: 'text-lime-200',
  ignored: 'text-slate-300',
  conflict: 'text-rose-200',
};

export const fileStatusBadges: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: '?',
  ignored: 'I',
  conflict: '!',
};

export const fileStatusLabels: Record<string, string> = {
  conflict: 'Conflict',
  deleted: 'Deleted',
  added: 'Added',
  modified: 'Modified',
  renamed: 'Renamed',
  copied: 'Copied',
  untracked: 'Untracked',
  ignored: 'Ignored',
};

export const FILE_STATUS_PRIORITY = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

export const FILE_STATUS_FILTERS = [...FILE_STATUS_PRIORITY];

export const fileStatusMarkToneClasses: Record<string, string> = {
  added:
    'bg-emerald-500/[0.14] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  modified:
    'bg-amber-400/[0.16] text-amber-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  deleted:
    'bg-rose-500/[0.16] text-rose-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  renamed:
    'bg-sky-500/[0.16] text-sky-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  copied:
    'bg-sky-500/[0.16] text-sky-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  untracked:
    'bg-lime-500/[0.16] text-lime-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  ignored:
    'bg-slate-400/[0.14] text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  conflict:
    'bg-rose-600/[0.2] text-rose-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
};

export const fileStatusFilterToneClasses: Record<string, string> = {
  added: 'bg-emerald-500/[0.12] text-emerald-100',
  modified: 'bg-amber-400/[0.14] text-amber-100',
  deleted: 'bg-rose-500/[0.14] text-rose-100',
  renamed: 'bg-sky-500/[0.14] text-sky-100',
  copied: 'bg-sky-500/[0.14] text-sky-100',
  untracked: 'bg-lime-500/[0.14] text-lime-100',
  ignored: 'bg-slate-400/[0.12] text-slate-100',
  conflict: 'bg-rose-600/[0.18] text-rose-50',
};
