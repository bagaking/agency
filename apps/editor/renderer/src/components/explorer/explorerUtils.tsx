import React from 'react';
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
  FolderClosed,
  FolderOpen,
  FolderGit2,
  FolderSearch,
  FolderCheck,
  FolderClock,
  FolderCog,
  FolderInput,
  FolderSync,
  Database,
  Binary,
  Package,
  Cpu,
  Layers,
  Terminal,
  FileWarning,
  FileLock,
  ScrollText,
  Workflow,
  Bot,
  Cpu as FolderCodeIcon, // Alias for FolderCode fallback
  Terminal as FolderTerminalIcon, // Alias for FolderTerminal fallback
  FileCode2,
} from 'lucide-react';

/**
 * 专门针对特定目录名的图标映射
 */
export const getFolderIcon = (name, isExpanded) => {
  const n = name.toLowerCase();
  
  // 基础映射
  if (n === '.git') return FolderGit2;
  if (n === '.codex' || n === 'src' || n === 'source') return FolderCodeIcon; // Lucide may not have FolderCode in all versions
  if (n === 'specs' || n === 'tests' || n === 'unit' || n === 'e2e') return FolderCheck;
  if (n === '.claude' || n === 'ai' || n === 'prompts') return FolderSearch;
  if (n === '.bagakit' || n === 'packages' || n === 'lib') return FolderInput;
  if (n === 'dist' || n === 'release' || n === 'build' || n === 'out') return FolderSync; // Using sync for build output
  if (n === 'logs' || n === 'temp' || n === 'tmp') return FolderClock;
  if (n === 'conf' || n === 'config' || n === 'settings' || n === '.agency') return FolderCog;
  if (n === 'scripts' || n === 'bin' || n === 'tools') return FolderTerminalIcon;
  if (n === 'node_modules') return FolderSync;
  if (n === 'public' || n === 'assets' || n === 'static') return Layers;

  // 默认返回
  return isExpanded ? FolderOpen : FolderClosed;
};

/**
 * 极其细化的文件图标映射
 */
export const getFileIcon = (name, isSymbolicLink) => {
  if (isSymbolicLink) return { icon: Link2, color: 'text-sky-400' };
  
  const n = name.toLowerCase();
  const ext = n.split('.').pop();

  // 1. 特殊文件名优先 (Exact Match)
  if (n === 'agents.md' || n === 'agent.md' || n === 'agents.yaml' || n === 'agents.yml') return { icon: Bot, color: 'text-primary' };
  
  // Go Stack
  if (n === 'go.mod' || n === 'go.sum' || n === 'go.work') return { icon: Package, color: 'text-cyan-500' };
  
  // Rust Stack
  if (n === 'cargo.toml' || n === 'cargo.lock') return { icon: Package, color: 'text-orange-600' };
  
  // JS/TS Stack
  if (n === 'package.json' || n === 'pnpm-lock.yaml' || n === 'yarn.lock' || n === 'package-lock.json') return { icon: Package, color: 'text-rose-400' };
  if (n.includes('vite.config') || n.includes('tailwind.config') || n.includes('postcss.config')) return { icon: FileCog, color: 'text-pink-400' };
  
  // Python Stack
  if (n === 'requirements.txt' || n === 'pipfile' || n === 'poetry.lock' || n === 'pyproject.toml') return { icon: FileCog, color: 'text-sky-500' };

  // Git & Worktree
  if (n === '.gitignore' || n === '.npmignore' || n === '.dockerignore' || n === '.gitattributes') return { icon: FileSymlink, color: 'text-muted-foreground/50' };
  if (n === '.worktree') return { icon: Link2, color: 'text-sky-400' };
  
  // Infrastructure
  if (n === 'readme.md') return { icon: ScrollText, color: 'text-primary' };
  if (n === 'license' || n === 'license.md' || n === 'license.txt') return { icon: FileWarning, color: 'text-amber-400' };
  if (n === '.env' || n.startsWith('.env.')) return { icon: FileLock, color: 'text-amber-200' };
  if (n === 'dockerfile' || n.includes('docker-compose')) return { icon: Layers, color: 'text-sky-500' };
  if (n === 'makefile' || n === 'cmakeLists.txt') return { icon: Workflow, color: 'text-orange-400' };
  if (n === '.editorconfig' || n === '.prettierrc' || n === '.eslintrc.js') return { icon: FileCog, color: 'text-slate-400' };

  // 2. 按后缀分类 (Extension Match)
  
  // 代码类
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return { icon: FileCode, color: 'text-amber-400' };
  if (['ts', 'tsx'].includes(ext)) return { icon: FileCode, color: 'text-blue-400' };
  if (['py', 'pyc', 'pyd', 'pyo'].includes(ext)) return { icon: FileCode, color: 'text-sky-400' };
  if (['go'].includes(ext)) return { icon: FileCode, color: 'text-cyan-400' };
  if (['rs', 'rlib'].includes(ext)) return { icon: FileCode, color: 'text-orange-500' };
  if (['c', 'cpp', 'h', 'hpp', 'cc', 'hh'].includes(ext)) return { icon: FileCode, color: 'text-purple-400' };
  if (['rb', 'rake'].includes(ext)) return { icon: FileCode, color: 'text-rose-500' };
  if (['java', 'jar', 'class'].includes(ext)) return { icon: FileCode, color: 'text-orange-400' };
  if (['sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1'].includes(ext)) return { icon: Terminal, color: 'text-emerald-400' };
  
  // 数据与配置
  if (['json', 'json5'].includes(ext)) return { icon: FileJson, color: 'text-amber-200' };
  if (['yaml', 'yml', 'toml', 'xml', 'ini', 'properties', 'conf'].includes(ext)) return { icon: FileCog, color: 'text-slate-300' };
  if (['sql', 'db', 'sqlite', 'sqlite3', 'mysql'].includes(ext)) return { icon: Database, color: 'text-indigo-400' };
  
  // 文档
  if (['md', 'markdown', 'txt', 'rtf', 'log'].includes(ext)) return { icon: FileText, color: 'text-muted-foreground/80' };
  if (['pdf'].includes(ext)) return { icon: FileType2, color: 'text-rose-500' };
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return { icon: FileType2, color: 'text-blue-500' };
  
  // 多媒体
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif'].includes(ext)) return { icon: FileImage, color: 'text-purple-400' };
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return { icon: FileAudio, color: 'text-cyan-400' };
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'].includes(ext)) return { icon: FileVideo, color: 'text-indigo-400' };
  
  // 二进制与压缩包
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg'].includes(ext)) return { icon: FileArchive, color: 'text-slate-400' };
  if (['exe', 'app', 'bin', 'so', 'o', 'a', 'dll'].includes(ext)) return { icon: Binary, color: 'text-emerald-500' };

  // 默认返回
  return { icon: FileText, color: 'text-muted-foreground/40' };
};

// 辅助图标 (用于在 getFileIcon 中引用)
function FileSymlink({ size, className, strokeWidth }: any) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m15 12-3-3-3 3" />
            <path d="M12 9v8" />
            <path d="M22 14v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
        </svg>
    );
}

export const statusColors = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-lime-300',
  ignored: 'text-slate-300',
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
  ignored: 'border-slate-300/50 bg-slate-300/10',
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
