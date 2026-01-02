import {
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileCog,
  FileSearch2,
  FileType2,
  Link2,
} from 'lucide-react';

export const getFileIcon = (name, isSymbolicLink) => {
  if (isSymbolicLink) return Link2;
  const ext = name.split('.').pop().toLowerCase();

  if (['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'c', 'cpp', 'java', 'rb', 'php', 'swift', 'sh', 'bash'].includes(ext)) return FileCode;
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'less'].includes(ext)) return FileJson;
  if (['md', 'txt', 'rtf', 'log'].includes(ext)) return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) return FileImage;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return FileAudio;
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return FileVideo;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return FileArchive;
  if (['env', 'config', 'ini', 'properties', 'yaml', 'yml'].includes(ext)) return FileCog;
  if (['sql', 'db', 'sqlite'].includes(ext)) return FileSearch2;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return FileType2;

  return FileText;
};

export const statusColors = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-lime-300',
  ignored: 'text-slate-400',
  conflict: 'text-rose-500',
};

export const statusBadges = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: '?',
  ignored: 'I',
  conflict: '!',
};

export const STATUS_PRIORITY = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

export const STATUS_FILTERS = [...STATUS_PRIORITY];

export const statusBadgeStyles = {
  added: 'border-emerald-500/40 bg-emerald-500/10',
  modified: 'border-amber-400/40 bg-amber-400/10',
  deleted: 'border-rose-400/40 bg-rose-400/10',
  renamed: 'border-sky-400/40 bg-sky-400/10',
  copied: 'border-sky-400/40 bg-sky-400/10',
  untracked: 'border-lime-500/40 bg-lime-500/10',
  ignored: 'border-slate-400/40 bg-slate-400/10',
  conflict: 'border-rose-500/50 bg-rose-500/15',
};

export const statusLabels = {
  conflict: 'Conflict',
  deleted: 'Deleted',
  added: 'Added',
  modified: 'Modified',
  renamed: 'Renamed',
  copied: 'Copied',
  untracked: 'Untracked',
  ignored: 'Ignored',
};

export const pickPrimaryStatus = (statusCounts = {}) => {
  for (const status of STATUS_PRIORITY) {
    if (statusCounts[status]) {
      return status;
    }
  }
  return null;
};
