import {
  detectWorkbenchSecureKind,
  resolveWorkbenchLanguage,
  type WorkbenchSecureKind,
} from './workbenchFileType';

export { detectWorkbenchSecureKind, resolveWorkbenchLanguage, type WorkbenchSecureKind };

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
