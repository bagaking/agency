export type WorkbenchSecureKind =
  | 'vector'
  | 'code'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'unknown';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif', 'bmp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);
const TEXT_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'md',
  'markdown',
  'mdx',
  'css',
  'scss',
  'less',
  'html',
  'htm',
  'xml',
  'py',
  'go',
  'rs',
  'c',
  'cpp',
  'cc',
  'cxx',
  'h',
  'hpp',
  'hxx',
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

const BASENAME_LANGUAGE_MAP: Record<string, string> = {
  '.dockerignore': 'gitignore',
  '.env': 'dotenv',
  '.eslintignore': 'gitignore',
  '.gitignore': 'gitignore',
  '.npmignore': 'gitignore',
  '.prettierignore': 'gitignore',
  authors: 'plaintext',
  brewfile: 'ruby',
  changelog: 'markdown',
  containerfile: 'dockerfile',
  copying: 'plaintext',
  gemfile: 'ruby',
  gnumakefile: 'makefile',
  justfile: 'makefile',
  licence: 'plaintext',
  license: 'plaintext',
  makefile: 'makefile',
  notice: 'plaintext',
  procfile: 'shell',
  rakefile: 'ruby',
  readme: 'markdown',
};

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  cjs: 'javascript',
  mjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  py: 'python',
  go: 'go',
  rs: 'rust',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  env: 'dotenv',
};

const basename = (filePath: string) =>
  String(filePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.toLowerCase() || '';

const extension = (name: string) => {
  const index = name.lastIndexOf('.');
  if (index <= 0) {
    return '';
  }
  return name.slice(index + 1);
};

const isDockerfileName = (name: string) =>
  name === 'dockerfile' ||
  name === 'containerfile' ||
  name.startsWith('dockerfile.') ||
  name.startsWith('containerfile.');

const isDotEnvFile = (name: string) => name === '.env' || name.startsWith('.env.');

const isKnownTextBasename = (name: string) => Object.hasOwn(BASENAME_LANGUAGE_MAP, name);

export const detectWorkbenchSecureKind = (filePath: string): WorkbenchSecureKind => {
  const name = basename(filePath);
  const ext = extension(name);

  if (ext === 'svg') {
    return 'vector';
  }
  if (isDockerfileName(name) || isDotEnvFile(name) || isKnownTextBasename(name)) {
    return 'code';
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return 'code';
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

export const resolveWorkbenchLanguage = (filePath: string) => {
  const name = basename(filePath);
  const ext = extension(name);

  if (isDockerfileName(name)) {
    return 'dockerfile';
  }
  if (isKnownTextBasename(name)) {
    return BASENAME_LANGUAGE_MAP[name];
  }
  if (isDotEnvFile(name)) {
    return 'dotenv';
  }
  if (ext === 'svg') {
    return 'xml';
  }
  return EXTENSION_LANGUAGE_MAP[ext] || 'plaintext';
};
