import {
  WORKBENCH_LANGUAGE_ID_DOTENV,
  WORKBENCH_LANGUAGE_ID_GITIGNORE,
  WORKBENCH_LANGUAGE_ID_MAKEFILE,
  WORKBENCH_LANGUAGE_ID_TOML,
} from '../../../../shared/workbenchLanguageCore';

const configuredMonacoInstances = new WeakSet<object>();

const registerWorkbenchLanguage = (
  monaco: any,
  languageId: string,
  definition: Record<string, unknown>,
  tokensProvider: Record<string, unknown>,
  configuration: Record<string, unknown>
) => {
  const languages = monaco?.languages;
  if (!languages) {
    return;
  }
  const existingIds = new Set(
    (languages.getLanguages?.() || [])
      .map((entry: any) => String(entry?.id || '').trim())
      .filter(Boolean)
  );
  if (existingIds.has(languageId)) {
    return;
  }
  languages.register?.(definition);
  languages.setMonarchTokensProvider?.(languageId, tokensProvider);
  languages.setLanguageConfiguration?.(languageId, configuration);
};

const TOML_TOKENS = {
  defaultToken: '',
  tokenPostfix: '.toml',
  keywords: ['true', 'false'],
  escapes: /\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4})/,
  tokenizer: {
    root: [
      [/^\s*\[[^\]]+\]\s*$/, 'type.identifier'],
      [/^\s*[A-Za-z0-9_.-]+(?=\s*=)/, 'key'],
      [/#.*$/, 'comment'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/\b(?:true|false)\b/, 'keyword'],
      [/\b\d+\.\d+\b/, 'number.float'],
      [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
      [/\b\d+\b/, 'number'],
      [/[{}[\]]/, '@brackets'],
      [/=/, 'delimiter'],
    ],
  },
};

const MAKEFILE_TOKENS = {
  defaultToken: '',
  tokenPostfix: '.makefile',
  tokenizer: {
    root: [
      [/^\s*#.*$/, 'comment'],
      [/^\t.*$/, 'string'],
      [/^\s*\.[A-Za-z_-]+\b/, 'keyword'],
      [/^\s*[A-Za-z0-9_.-]+\s*(?=[:+?]?=)/, 'variable'],
      [/^\s*[A-Za-z0-9_./%-]+(?=\s*:)/, 'type.identifier'],
      [/\$\([^)]+\)|\$\{[^}]+\}/, 'variable.predefined'],
      [
        /\b(?:include|ifdef|ifndef|ifeq|ifneq|else|endif|override|export|unexport|private|define|endef|undefine|vpath)\b/,
        'keyword',
      ],
      [/#.*$/, 'comment'],
      [/[:+?]?=/, 'delimiter'],
    ],
  },
};

const GITIGNORE_TOKENS = {
  defaultToken: '',
  tokenPostfix: '.gitignore',
  tokenizer: {
    root: [
      [/^\s*#.*$/, 'comment'],
      [/^\s*!.*$/, 'keyword'],
      [/^\s*\/.*\/\s*$/, 'type.identifier'],
      [/\*\*|\*|\?/, 'regexp'],
      [/\[[^\]]+\]/, 'regexp'],
      [/[^#\s][^]*/, 'string'],
    ],
  },
};

const DOTENV_TOKENS = {
  defaultToken: '',
  tokenPostfix: '.dotenv',
  tokenizer: {
    root: [
      [/^\s*#.*$/, 'comment'],
      [/^\s*export\b/, 'keyword'],
      [/^\s*[A-Za-z_][A-Za-z0-9_]*(?=\s*=)/, 'key'],
      [/\$\{[^}]+\}/, 'variable'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/\b(?:true|false|null)\b/, 'keyword'],
      [/=/, 'delimiter'],
    ],
  },
};

export const configureWorkbenchMonaco = (monaco: any) => {
  if (!monaco || typeof monaco !== 'object') {
    return;
  }
  if (configuredMonacoInstances.has(monaco)) {
    return;
  }
  configuredMonacoInstances.add(monaco);

  registerWorkbenchLanguage(
    monaco,
    WORKBENCH_LANGUAGE_ID_TOML,
    {
      id: WORKBENCH_LANGUAGE_ID_TOML,
      extensions: ['.toml'],
      aliases: ['TOML', 'toml'],
    },
    TOML_TOKENS,
    {
      comments: { lineComment: '#' },
      brackets: [
        ['[', ']'],
        ['{', '}'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    }
  );

  registerWorkbenchLanguage(
    monaco,
    WORKBENCH_LANGUAGE_ID_MAKEFILE,
    {
      id: WORKBENCH_LANGUAGE_ID_MAKEFILE,
      aliases: ['Makefile', 'makefile'],
    },
    MAKEFILE_TOKENS,
    {
      comments: { lineComment: '#' },
      brackets: [['(', ')']],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '{', close: '}' },
      ],
    }
  );

  registerWorkbenchLanguage(
    monaco,
    WORKBENCH_LANGUAGE_ID_GITIGNORE,
    {
      id: WORKBENCH_LANGUAGE_ID_GITIGNORE,
      aliases: ['Git Ignore', 'gitignore'],
    },
    GITIGNORE_TOKENS,
    {
      comments: { lineComment: '#' },
    }
  );

  registerWorkbenchLanguage(
    monaco,
    WORKBENCH_LANGUAGE_ID_DOTENV,
    {
      id: WORKBENCH_LANGUAGE_ID_DOTENV,
      aliases: ['dotenv', '.env'],
    },
    DOTENV_TOKENS,
    {
      comments: { lineComment: '#' },
      autoClosingPairs: [
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    }
  );
};
