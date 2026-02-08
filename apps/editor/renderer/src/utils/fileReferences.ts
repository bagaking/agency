const TRAILING_PATH_PUNCTUATION = /[.,;:!?)}\]。，；：！？）】》」』、]+$/;
const ANSI_ESCAPE_REGEX = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const PATH_TOKEN_REGEX =
  /(^|[^A-Za-z0-9_@./~+-])((?:[A-Za-z]:[\\/]|\/|\.{1,2}\/)?[A-Za-z0-9_@./~+\\-]+(?:[\\/][A-Za-z0-9_@./~+\\-]+)+\.[A-Za-z0-9]+(?::\d+(?::\d+)?)?)/g;
const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:\//;

const normalizeSlashes = (value: string) => String(value || '').replace(/\\/g, '/');

const normalizeRootPath = (value: string) =>
  normalizeSlashes(String(value || '').trim())
    .replace(/\/+$/, '')
    .replace(/\/\/{2,}/g, '/');

const stripTrailingPunctuation = (value: string) =>
  String(value || '').trim().replace(TRAILING_PATH_PUNCTUATION, '');

const normalizeCandidatePath = (value: string) => {
  let normalized = normalizeSlashes(String(value || '').trim()).replace(/\/\/{2,}/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  return normalized;
};

const parsePathWithPosition = (rawValue: string) => {
  let targetPath = stripTrailingPunctuation(rawValue);
  let line: number | null = null;
  let column: number | null = null;

  const consumeNumericSuffix = () => {
    const separator = targetPath.lastIndexOf(':');
    if (separator <= 1) {
      return null;
    }
    const suffix = targetPath.slice(separator + 1);
    if (!/^\d+$/.test(suffix)) {
      return null;
    }
    targetPath = targetPath.slice(0, separator);
    return Number(suffix);
  };

  const first = consumeNumericSuffix();
  if (first !== null) {
    const second = consumeNumericSuffix();
    if (second !== null) {
      line = second;
      column = first;
    } else {
      line = first;
    }
  }

  return {
    path: targetPath,
    line,
    column,
  };
};

export type FileReferenceTarget = {
  rawText: string;
  relativePath: string;
  absolutePath: string;
  displayPath: string;
  line: number | null;
  column: number | null;
};

export const resolveFileReferenceTarget = ({
  path,
  rootPath,
}: {
  path?: string;
  rootPath?: string;
}): { relativePath: string; absolutePath: string } | null => {
  const normalizedPath = normalizeCandidatePath(String(path || ''));
  if (!normalizedPath) {
    return null;
  }

  const normalizedRoot = normalizeRootPath(String(rootPath || ''));

  if (normalizedPath.startsWith('/')) {
    if (!normalizedRoot) {
      return null;
    }
    const rootPrefix = `${normalizedRoot}/`;
    if (normalizedPath === normalizedRoot) {
      return null;
    }
    if (!normalizedPath.startsWith(rootPrefix)) {
      return null;
    }
    return {
      relativePath: normalizedPath.slice(rootPrefix.length),
      absolutePath: normalizedPath,
    };
  }

  if (WINDOWS_ABSOLUTE_PATH.test(normalizedPath)) {
    if (!normalizedRoot) {
      return null;
    }
    const rootLower = normalizedRoot.toLowerCase();
    const targetLower = normalizedPath.toLowerCase();
    const rootPrefix = `${rootLower}/`;
    if (targetLower === rootLower) {
      return null;
    }
    if (!targetLower.startsWith(rootPrefix)) {
      return null;
    }
    return {
      relativePath: normalizedPath.slice(normalizedRoot.length + 1),
      absolutePath: normalizedPath,
    };
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  if (!relativePath) {
    return null;
  }
  return {
    relativePath,
    absolutePath: normalizedRoot ? `${normalizedRoot}/${relativePath}` : '',
  };
};

export const extractFileReferences = (
  value: string,
  { rootPath = '', limit = 5 }: { rootPath?: string; limit?: number } = {}
): FileReferenceTarget[] => {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(ANSI_ESCAPE_REGEX, '');
  const maxResults = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
  const references: FileReferenceTarget[] = [];
  const seen = new Set<string>();

  PATH_TOKEN_REGEX.lastIndex = 0;
  let match = PATH_TOKEN_REGEX.exec(text);
  while (match && references.length < maxResults) {
    const rawToken = match[2] || '';
    const parsed = parsePathWithPosition(rawToken);
    const resolved = resolveFileReferenceTarget({
      path: parsed.path,
      rootPath,
    });
    if (resolved?.relativePath) {
      const key = `${resolved.relativePath}:${parsed.line || ''}:${parsed.column || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        references.push({
          rawText: rawToken,
          relativePath: resolved.relativePath,
          absolutePath: resolved.absolutePath,
          displayPath: resolved.relativePath.split('/').pop() || resolved.relativePath,
          line: parsed.line,
          column: parsed.column,
        });
      }
    }
    match = PATH_TOKEN_REGEX.exec(text);
  }

  return references;
};

export const __testFileReferences = {
  normalizeCandidatePath,
  parsePathWithPosition,
  stripTrailingPunctuation,
};
