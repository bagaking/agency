export type WorkbenchQuickOpenTab = {
  id: string;
  path: string;
  title: string;
  rootPath?: string;
  isPreview?: boolean;
};

export type WorkbenchQuickOpenItem = {
  id: string;
  kind: 'tab' | 'file';
  path: string;
  title: string;
  subtitle: string;
  badge?: string;
  tabId?: string;
  isActive?: boolean;
  rootPath?: string;
  line?: number;
  column?: number;
};

export type WorkbenchQuickOpenSection = {
  id: string;
  label: string;
  items: WorkbenchQuickOpenItem[];
};

const normalizeQuery = (value: unknown) => String(value || '').trim().toLowerCase();

const matchesQuery = (value: string, query: string) =>
  !query || String(value || '').toLowerCase().includes(query);

export type WorkbenchQuickOpenQuery = {
  raw: string;
  pathQuery: string;
  line: number | null;
  column: number | null;
  hasLocation: boolean;
};

export function parseWorkbenchQuickOpenQuery(input: unknown): WorkbenchQuickOpenQuery {
  const raw = String(input || '').trim();
  const match = /^(.*?)(?::(\d+))?(?::(\d+))?$/.exec(raw);
  const rawPathQuery = match ? String(match[1] || '') : raw;
  const line = match?.[2] ? Math.max(1, Number(match[2])) : null;
  const column = match?.[3] ? Math.max(1, Number(match[3])) : null;
  const pathQuery = rawPathQuery.trim();
  return {
    raw,
    pathQuery,
    line,
    column,
    hasLocation: Number.isFinite(line) || Number.isFinite(column),
  };
}

export function buildWorkbenchQuickOpenSections({
  query,
  openTabs,
  activeTabId,
  fileMatches,
}: {
  query: string;
  openTabs: WorkbenchQuickOpenTab[];
  activeTabId?: string | null;
  fileMatches: string[];
}): WorkbenchQuickOpenSection[] {
  const parsedQuery = parseWorkbenchQuickOpenQuery(query);
  const normalizedQuery = normalizeQuery(parsedQuery.pathQuery);
  const tabs = (Array.isArray(openTabs) ? openTabs : []).filter(
    (tab) => tab?.id && tab?.path
  );
  const visibleTabs = tabs.filter(
    (tab) => matchesQuery(tab.title, normalizedQuery) || matchesQuery(tab.path, normalizedQuery)
  );

  const openTabSection: WorkbenchQuickOpenSection | null = visibleTabs.length
    ? {
        id: 'open-tabs',
        label: 'Open Tabs',
        items: visibleTabs.map((tab) => ({
          id: `tab:${tab.id}`,
          kind: 'tab',
          path: tab.path,
          title: tab.title || tab.path,
          subtitle: tab.path,
          badge: tab.isPreview ? 'Preview' : 'Pinned',
          tabId: tab.id,
          isActive: activeTabId === tab.id,
          rootPath: tab.rootPath || '',
          line: parsedQuery.line || undefined,
          column: parsedQuery.column || undefined,
        })),
      }
    : null;

  const openTabPaths = new Set(visibleTabs.map((tab) => tab.path));
  const visibleFiles = (Array.isArray(fileMatches) ? fileMatches : [])
    .filter(Boolean)
    .filter((filePath) => !openTabPaths.has(filePath));

  const fileSection: WorkbenchQuickOpenSection | null = visibleFiles.length
    ? {
        id: 'project-files',
        label: 'Project Files',
        items: visibleFiles.map((filePath) => ({
          id: `file:${filePath}`,
          kind: 'file',
          path: filePath,
          title: filePath.split('/').filter(Boolean).pop() || filePath,
          subtitle: filePath,
          rootPath: '',
          line: parsedQuery.line || undefined,
          column: parsedQuery.column || undefined,
        })),
      }
    : null;

  return [openTabSection, fileSection].filter(Boolean) as WorkbenchQuickOpenSection[];
}
