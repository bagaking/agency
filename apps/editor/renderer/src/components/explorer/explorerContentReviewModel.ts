import type { ExplorerContentSearchConfirmedMatch } from './useExplorerContentSearch';

type ExplorerContentReviewSelectionArgs = {
  fullFilePaths: string[];
  confirmedMatches: ExplorerContentSearchConfirmedMatch[];
};

export const buildExplorerConfirmedContentFilePaths = ({
  fullFilePaths,
  confirmedMatches,
}: ExplorerContentReviewSelectionArgs): string[] =>
  Array.from(new Set([...fullFilePaths, ...confirmedMatches.map((entry) => entry.path)]));

export const buildExplorerContentReplaceRequest = ({
  fullFilePaths,
  confirmedMatches,
}: ExplorerContentReviewSelectionArgs): {
  confirmedPaths: string[];
  confirmedMatches: ExplorerContentSearchConfirmedMatch[];
} => ({
  confirmedPaths: Array.from(new Set(fullFilePaths)),
  confirmedMatches,
});
