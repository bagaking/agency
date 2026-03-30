export type WorkbenchLanguageProviderKind = 'monaco-native' | 'workbench-monarch';

export type WorkbenchLanguageOption = {
  id: string;
  label: string;
  provider: WorkbenchLanguageProviderKind;
  aliases?: string[];
};

export const WORKBENCH_LANGUAGE_ID_PLAINTEXT = 'plaintext';
export const WORKBENCH_LANGUAGE_ID_TOML = 'toml';
export const WORKBENCH_LANGUAGE_ID_MAKEFILE = 'makefile';
export const WORKBENCH_LANGUAGE_ID_GITIGNORE = 'gitignore';
export const WORKBENCH_LANGUAGE_ID_DOTENV = 'dotenv';

export const WORKBENCH_LANGUAGE_OPTIONS: ReadonlyArray<WorkbenchLanguageOption> = Object.freeze([
  { id: 'plaintext', label: 'Plain Text', provider: 'monaco-native', aliases: ['text'] },
  { id: 'javascript', label: 'JavaScript', provider: 'monaco-native', aliases: ['js'] },
  { id: 'typescript', label: 'TypeScript', provider: 'monaco-native', aliases: ['ts'] },
  { id: 'json', label: 'JSON', provider: 'monaco-native' },
  { id: 'markdown', label: 'Markdown', provider: 'monaco-native', aliases: ['md'] },
  { id: 'css', label: 'CSS', provider: 'monaco-native' },
  { id: 'scss', label: 'SCSS', provider: 'monaco-native' },
  { id: 'less', label: 'Less', provider: 'monaco-native' },
  { id: 'html', label: 'HTML', provider: 'monaco-native' },
  { id: 'xml', label: 'XML / SVG', provider: 'monaco-native' },
  { id: 'yaml', label: 'YAML', provider: 'monaco-native', aliases: ['yml'] },
  { id: 'python', label: 'Python', provider: 'monaco-native', aliases: ['py'] },
  { id: 'go', label: 'Go', provider: 'monaco-native' },
  { id: 'rust', label: 'Rust', provider: 'monaco-native', aliases: ['rs'] },
  { id: 'shell', label: 'Shell', provider: 'monaco-native', aliases: ['bash', 'zsh', 'sh'] },
  { id: 'sql', label: 'SQL', provider: 'monaco-native' },
  { id: 'c', label: 'C', provider: 'monaco-native' },
  { id: 'cpp', label: 'C++', provider: 'monaco-native' },
  { id: 'java', label: 'Java', provider: 'monaco-native' },
  { id: 'ruby', label: 'Ruby', provider: 'monaco-native' },
  { id: 'php', label: 'PHP', provider: 'monaco-native' },
  { id: 'dockerfile', label: 'Dockerfile', provider: 'monaco-native' },
  { id: WORKBENCH_LANGUAGE_ID_TOML, label: 'TOML', provider: 'workbench-monarch' },
  { id: WORKBENCH_LANGUAGE_ID_MAKEFILE, label: 'Makefile', provider: 'workbench-monarch' },
  { id: WORKBENCH_LANGUAGE_ID_GITIGNORE, label: 'Git Ignore', provider: 'workbench-monarch' },
  { id: WORKBENCH_LANGUAGE_ID_DOTENV, label: 'Dotenv', provider: 'workbench-monarch' },
]);

const OPTION_BY_ID = new Map(
  WORKBENCH_LANGUAGE_OPTIONS.map((option) => [option.id, option] as const)
);

export type WorkbenchProjectLanguageRule = {
  match: string;
  language: string;
  description?: string;
};

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeRuleMatch = (value: unknown) =>
  normalizeText(value).replace(/\\/g, '/').replace(/^\.?\//, '');

const escapeRegExp = (value: string) => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

const compileGlobLikePattern = (pattern: string) => {
  let result = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const nextChar = pattern[index + 1];
    if (char === '*' && nextChar === '*') {
      result += '.*';
      index += 1;
      continue;
    }
    if (char === '*') {
      result += '[^/]*';
      continue;
    }
    if (char === '?') {
      result += '[^/]';
      continue;
    }
    result += escapeRegExp(char);
  }
  result += '$';
  return new RegExp(result);
};

const normalizePathForMatching = (value: string) =>
  normalizeRuleMatch(value).replace(/\/+/g, '/');

export const getWorkbenchLanguageOption = (languageId: unknown) =>
  OPTION_BY_ID.get(normalizeText(languageId));

export const normalizeWorkbenchLanguageId = (
  value: unknown,
  fallback = WORKBENCH_LANGUAGE_ID_PLAINTEXT
) => {
  const normalized = normalizeText(value);
  return OPTION_BY_ID.has(normalized) ? normalized : fallback;
};

export const getWorkbenchLanguageLabel = (languageId: unknown) =>
  getWorkbenchLanguageOption(languageId)?.label || 'Plain Text';

export const normalizeWorkbenchProjectLanguageRules = (
  value: unknown
): WorkbenchProjectLanguageRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  return value
    .map((entry) => {
      const source =
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const match = normalizeRuleMatch(source.match);
      const language = normalizeWorkbenchLanguageId(source.language, '');
      if (!match || !language) {
        return null;
      }
      const dedupeKey = `${match}::${language}`;
      if (seen.has(dedupeKey)) {
        return null;
      }
      seen.add(dedupeKey);
      const description = normalizeText(source.description);
      return {
        match,
        language,
        ...(description ? { description } : {}),
      };
    })
    .filter((rule): rule is WorkbenchProjectLanguageRule => Boolean(rule));
};

export const matchWorkbenchProjectLanguageRule = (
  targetPath: string,
  rules: WorkbenchProjectLanguageRule[] = []
) => {
  const normalizedPath = normalizePathForMatching(targetPath);
  if (!normalizedPath) {
    return null;
  }
  const basename = normalizedPath.split('/').pop() || normalizedPath;
  for (const rule of rules) {
    const subject = rule.match.includes('/') ? normalizedPath : basename;
    if (compileGlobLikePattern(rule.match).test(subject)) {
      return rule;
    }
  }
  return null;
};
