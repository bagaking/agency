const toRelativePath = (value: string) => value.replace(/\\/g, '/').replace(/^\.?\//, '');

const buildAncestorPaths = (path: string) => {
  const parts = path.split('/').filter(Boolean);
  const ancestors = [''];
  let current = '';
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = [current, parts[i]].filter(Boolean).join('/');
    ancestors.push(current);
  }
  return ancestors;
};

const basename = (value: string) => value.split('/').pop() || value;

type ExplorerSearchMatch =
  | string
  | {
      path?: string;
      name?: string;
      type?: string;
      isSymbolicLink?: boolean;
      symlinkBoundaryState?: string;
    };

function normalizeSearchMatch(match: ExplorerSearchMatch) {
  const path = typeof match === 'string' ? toRelativePath(match) : toRelativePath(String(match?.path || ''));
  if (!path) {
    return null;
  }
  return {
    path,
    name: typeof match === 'string' ? basename(path) : match?.name || basename(path),
    type: typeof match === 'string' ? 'file' : match?.type === 'dir' ? 'dir' : 'file',
    isSymbolicLink: typeof match === 'string' ? false : Boolean(match?.isSymbolicLink),
    symlinkBoundaryState: typeof match === 'string' ? undefined : match?.symlinkBoundaryState,
  };
}

export function buildTreeFromMatches(matches: ExplorerSearchMatch[] = []) {
  const nodes: Record<string, any> = {
    '': { path: '', name: '', type: 'dir' },
  };
  const children: Record<string, string[]> = { '': [] };
  const ensureNode = (path: string, type = 'dir') => {
    if (!nodes[path]) {
      const name = path.split('/').filter(Boolean).pop() || '';
      nodes[path] = { path, name, type };
    }
    if (!children[path]) {
      children[path] = [];
    }
  };

  matches.forEach((rawMatch) => {
    const match = normalizeSearchMatch(rawMatch);
    if (!match) {
      return;
    }
    const ancestors = buildAncestorPaths(match.path);
    ancestors.forEach((ancestor) => ensureNode(ancestor, 'dir'));
    nodes[match.path] = {
      path: match.path,
      name: match.name,
      type: match.type,
      isSymbolicLink: match.isSymbolicLink,
      symlinkBoundaryState: match.symlinkBoundaryState,
    };
    if (!children[match.path]) {
      children[match.path] = [];
    }
    ancestors.forEach((ancestor, index) => {
      const next = index === ancestors.length - 1 ? match.path : ancestors[index + 1];
      if (next && !children[ancestor].includes(next)) {
        children[ancestor].push(next);
      }
    });
  });

  Object.keys(children).forEach((key) => {
    children[key] = children[key].sort((a, b) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (nodeA?.type !== nodeB?.type) {
        return nodeA?.type === 'dir' ? -1 : 1;
      }
      return (nodeA?.name || '').localeCompare(nodeB?.name || '');
    });
  });

  return { nodes, children };
}
