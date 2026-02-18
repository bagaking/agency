import {
  blameWorkbenchEntry,
  diffWorkbenchEntry,
  writeWorkbenchEntry,
} from '../../services/agencyBridge';

export const normalizeWorkbenchSaveAsPath = (inputPath: string) =>
  String(inputPath || '').replace(/\\/g, '/').replace(/^\.?\//, '');

export const saveWorkbenchTabContent = async ({
  rootPath,
  targetPath,
  content,
}: {
  rootPath: string;
  targetPath: string;
  content: string;
}) =>
  writeWorkbenchEntry({
    rootPath,
    targetPath,
    content,
  });

export const loadWorkbenchDiffHunks = async ({
  rootPath,
  targetPath,
}: {
  rootPath: string;
  targetPath: string;
}) => {
  const result = await diffWorkbenchEntry({ rootPath, targetPath });
  return result?.hunks || [];
};

export const loadWorkbenchBlameLines = async ({
  rootPath,
  targetPath,
}: {
  rootPath: string;
  targetPath: string;
}) => {
  const result = await blameWorkbenchEntry({ rootPath, targetPath });
  return result?.lines || [];
};
