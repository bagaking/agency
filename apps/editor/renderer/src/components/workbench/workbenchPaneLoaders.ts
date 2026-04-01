import {
  getWorkbenchFileUrl,
  readWorkbenchEntry,
  statWorkbenchEntry,
} from '../../services/agencyBridge';
import {
  detectWorkbenchSecureKind,
  resolveWorkbenchLanguage,
  type WorkbenchSecureKind,
} from './workbenchPaneHelpers';
import { isWorkbenchBoundedResearchTab } from './workbenchBoundedResearch';
import { parseExplorerResearchFrontmatter } from '../explorer/explorerResearchArtifacts';

type WorkbenchTabTarget = {
  rootPath: string;
  targetPath: string;
};

type WorkbenchTabLoadResult = Record<string, any>;

const baseLoadedState = {
  loading: false,
  needsReload: false,
  diskMtimeMs: 0,
};

const loadVectorWorkbenchState = async ({
  rootPath,
  targetPath,
}: WorkbenchTabTarget): Promise<WorkbenchTabLoadResult> => {
  const [contentResult, urlResult, meta] = await Promise.all([
    readWorkbenchEntry({ rootPath, targetPath }),
    getWorkbenchFileUrl({ rootPath, targetPath }),
    statWorkbenchEntry({ rootPath, targetPath }),
  ]);
  const content = contentResult?.content || '';
  return {
    ...baseLoadedState,
    content,
    syncedContent: content,
    fileUrl: urlResult?.url || '',
    size: meta?.size || 0,
    mtimeMs: meta?.mtimeMs || 0,
    language: resolveWorkbenchLanguage(targetPath),
    isDirty: false,
    kind: 'vector',
  };
};

const loadMediaWorkbenchState = async ({
  rootPath,
  targetPath,
  kind,
}: WorkbenchTabTarget & {
  kind: WorkbenchSecureKind;
}): Promise<WorkbenchTabLoadResult> => {
  const [meta, urlResult] = await Promise.all([
    statWorkbenchEntry({ rootPath, targetPath }),
    getWorkbenchFileUrl({ rootPath, targetPath }),
  ]);
  return {
    ...baseLoadedState,
    fileUrl: urlResult?.url || '',
    size: meta?.size || 0,
    mtimeMs: meta?.mtimeMs || 0,
    kind,
  };
};

const loadCodeWorkbenchState = async ({
  rootPath,
  targetPath,
}: WorkbenchTabTarget): Promise<WorkbenchTabLoadResult> => {
  const result = await readWorkbenchEntry({ rootPath, targetPath });
  const content = result?.content || '';
  const language = resolveWorkbenchLanguage(targetPath);
  const researchSource = language === 'markdown' ? parseExplorerResearchFrontmatter(content) : null;
  return {
    ...baseLoadedState,
    content,
    syncedContent: content,
    size: result?.size || 0,
    mtimeMs: result?.mtimeMs || 0,
    binary: Boolean(result?.binary),
    truncated: Boolean(result?.truncated),
    language,
    isDirty: false,
    kind: 'code',
    researchSourceUrl: researchSource?.url || '',
    researchSourceTitle: researchSource?.title || '',
    researchSourceSiteName: researchSource?.siteName || '',
  };
};

const loadUnknownWorkbenchState = async ({
  rootPath,
  targetPath,
}: WorkbenchTabTarget): Promise<WorkbenchTabLoadResult> => {
  const meta = await statWorkbenchEntry({ rootPath, targetPath });
  return {
    ...baseLoadedState,
    size: meta?.size || 0,
    mtimeMs: meta?.mtimeMs || 0,
    kind: 'unknown',
  };
};

const loadBoundedWebResearchState = async (): Promise<WorkbenchTabLoadResult> => {
  return {
    ...baseLoadedState,
    kind: 'bounded-web-research',
    isDirty: false,
  };
};

export const loadWorkbenchTabState = async ({
  rootPath,
  targetPath,
  tab,
}: WorkbenchTabTarget & { tab?: any }): Promise<WorkbenchTabLoadResult> => {
  if (isWorkbenchBoundedResearchTab(tab)) {
    return loadBoundedWebResearchState();
  }
  const secureKind = detectWorkbenchSecureKind(targetPath);
  if (secureKind === 'vector') {
    return loadVectorWorkbenchState({ rootPath, targetPath });
  }
  if (['image', 'video', 'audio', 'pdf'].includes(secureKind)) {
    return loadMediaWorkbenchState({ rootPath, targetPath, kind: secureKind });
  }
  if (secureKind === 'code') {
    return loadCodeWorkbenchState({ rootPath, targetPath });
  }
  return loadUnknownWorkbenchState({ rootPath, targetPath });
};

export const loadWorkbenchCodeState = async ({
  rootPath,
  targetPath,
}: WorkbenchTabTarget): Promise<WorkbenchTabLoadResult> => {
  const state = await loadCodeWorkbenchState({ rootPath, targetPath });
  return {
    ...state,
    unlocked: true,
  };
};
