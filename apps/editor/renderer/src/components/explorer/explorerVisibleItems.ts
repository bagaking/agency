export type ExplorerVisibleItem = {
  path: string;
  depth: number;
  type: 'dir' | 'file';
  isSymbolicLink?: boolean;
  setSize?: number;
  posInSet?: number;
  draft?: boolean;
};

type ExplorerTreeNode = {
  type?: string;
  name?: string;
  isSymbolicLink?: boolean;
};

type ExplorerTree = {
  nodes: Record<string, ExplorerTreeNode | undefined>;
  children: Record<string, string[] | undefined>;
};

type ExplorerDraftEntry = {
  parentPath: string;
  type: 'dir' | 'file';
};

type BuildExplorerVisibleItemsOptions = {
  tree: ExplorerTree;
  expandedPaths: ReadonlySet<string>;
  isSearchActive: boolean;
  showHidden: boolean;
  showIgnored: boolean;
  draftEntry: ExplorerDraftEntry | null;
  folderStatusByPath: Record<string, any>;
  statusByPath: Record<string, any>;
  getScopedEntry: (entry: any, type: 'dir' | 'file') => any;
  hasChangeFilter: boolean;
  hasStatusFilters: boolean;
  statusFilterSet: ReadonlySet<string>;
  matchesSemanticFilter: (path: string) => boolean;
  isPathIgnored: (path: string) => boolean;
};

export const buildExplorerVisibleItems = ({
  tree,
  expandedPaths,
  isSearchActive,
  showHidden,
  showIgnored,
  draftEntry,
  folderStatusByPath,
  statusByPath,
  getScopedEntry,
  hasChangeFilter,
  hasStatusFilters,
  statusFilterSet,
  matchesSemanticFilter,
  isPathIgnored,
}: BuildExplorerVisibleItemsOptions): ExplorerVisibleItem[] => {
  const items: ExplorerVisibleItem[] = [];
  const includeCache = new Map<string, boolean>();
  const visibilityCache = new Map<string, boolean>();
  const matchCache = new Map<string, boolean>();

  const shouldInclude = (path: string, node: ExplorerTreeNode): boolean => {
    const cached = includeCache.get(path);
    if (cached != null) {
      return cached;
    }

    const nodeType: 'dir' | 'file' = node.type === 'dir' ? 'dir' : 'file';
    const entry = nodeType === 'dir' ? folderStatusByPath[path] : statusByPath[path];
    const scoped = getScopedEntry(entry, nodeType);
    let status = scoped?.status || null;
    if (nodeType === 'dir' && !statusByPath[path] && status === 'ignored') {
      status = null;
    }
    const statusMatches =
      !hasChangeFilter || Boolean(status && (!hasStatusFilters || statusFilterSet.has(status)));
    const semanticMatches = matchesSemanticFilter(path);
    const matched = statusMatches && semanticMatches;
    includeCache.set(path, matched);
    return matched;
  };

  const isVisible = (path: string, node: ExplorerTreeNode): boolean => {
    if (!path) {
      return true;
    }

    const cached = visibilityCache.get(path);
    if (cached != null) {
      return cached;
    }

    const visible =
      (showHidden || !String(node.name || '').startsWith('.')) &&
      (showIgnored || !isPathIgnored(path));
    visibilityCache.set(path, visible);
    return visible;
  };

  const checkMatch = (path: string): boolean => {
    const cached = matchCache.get(path);
    if (cached != null) {
      return cached;
    }

    const node = tree.nodes[path];
    if (!node || !isVisible(path, node)) {
      matchCache.set(path, false);
      return false;
    }

    const children = tree.children[path] || [];
    const matched =
      shouldInclude(path, node) ||
      (node.type === 'dir' && children.some((child) => checkMatch(child)));
    matchCache.set(path, matched);
    return matched;
  };

  const walk = (
    path: string,
    depth: number,
    setSize = 0,
    posInSet = 0
  ) => {
    const node = tree.nodes[path];
    if (!node || !isVisible(path, node)) {
      return;
    }

    const isDir = node.type === 'dir';
    const selfMatches = path ? shouldInclude(path, node) : true;
    const children = tree.children[path] || [];
    const childHasMatch = isDir ? children.some((child) => checkMatch(child)) : false;
    const shouldShow = path ? selfMatches || childHasMatch : true;

    if (path && shouldShow) {
      items.push({
        path,
        depth,
        type: isDir ? 'dir' : 'file',
        isSymbolicLink: node.isSymbolicLink,
        setSize,
        posInSet,
      });
    }

    if (isDir && shouldShow && (isSearchActive || expandedPaths.has(path))) {
      const visibleChildren = children.filter((child) => checkMatch(child));
      visibleChildren.forEach((child, index) =>
        walk(child, depth + 1, visibleChildren.length, index + 1)
      );
    }
  };

  const rootChildren = (tree.children[''] || []).filter((child) => checkMatch(child));
  rootChildren.forEach((child, index) => walk(child, 0, rootChildren.length, index + 1));

  if (draftEntry) {
    const draftParentPath = String(draftEntry.parentPath || '');
    if (!draftParentPath) {
      items.unshift({
        path: '__d__root',
        depth: 0,
        type: draftEntry.type,
        draft: true,
      });
    } else {
      const idx = items.findIndex((it) => it.path === draftParentPath);
      if (idx >= 0) {
        items.splice(idx + 1, 0, {
          path: `__d__${draftParentPath}`,
          depth: items[idx].depth + 1,
          type: draftEntry.type,
          draft: true,
        });
      }
    }
  }

  return items;
};
