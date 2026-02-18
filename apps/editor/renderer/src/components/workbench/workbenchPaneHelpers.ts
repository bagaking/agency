export type WorkbenchSecureKind =
  | 'vector'
  | 'code'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'unknown';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: 'javascript',
  cjs: 'javascript',
  mjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  css: 'css',
  html: 'html',
  yaml: 'yaml',
  yml: 'yaml',
  py: 'python',
  go: 'go',
  rs: 'rust',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
};

const TEXT_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'json',
  'yaml',
  'yml',
  'toml',
  'md',
  'markdown',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'py',
  'go',
  'rs',
  'c',
  'cpp',
  'h',
  'hpp',
  'java',
  'rb',
  'php',
  'sh',
  'bash',
  'zsh',
  'sql',
  'txt',
  'log',
  'env',
  'gitignore',
  'makefile',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav']);
const MEDIA_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  'pdf',
  'svg',
]);

const extensionFromPath = (filePath: string) =>
  (String(filePath || '').split('.').pop() || '').toLowerCase();

export const resolveWorkbenchLanguage = (filePath: string) => {
  const ext = extensionFromPath(filePath);
  return LANGUAGE_BY_EXTENSION[ext] || 'plaintext';
};

export const detectWorkbenchSecureKind = (
  filePath: string
): WorkbenchSecureKind => {
  const ext = extensionFromPath(filePath);
  if (ext === 'svg') {
    return 'vector';
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return 'code';
  }
  if (!MEDIA_EXTENSIONS.has(ext)) {
    return 'unknown';
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return 'audio';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  return 'unknown';
};

export const formatWorkbenchBytes = (value: number | null | undefined) => {
  if (!value && value !== 0) {
    return '';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export type WorkbenchBreadcrumb = {
  id: string;
  label: string;
  path: string;
  isLast: boolean;
};

export const buildWorkbenchBreadcrumbs = (
  path: string
): WorkbenchBreadcrumb[] => {
  const parts = String(path || '').split('/').filter(Boolean);
  let currentPath = '';
  return parts.map((label, index) => {
    currentPath = currentPath ? `${currentPath}/${label}` : label;
    return {
      id: `${currentPath}:${index}`,
      label,
      path: currentPath,
      isLast: index === parts.length - 1,
    };
  });
};

export const WORKBENCH_TAB_DISK_SYNC_INTERVAL_MS = 2500;
