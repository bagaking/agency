export type ExplorerResearchPreview = {
  url: string;
  title: string;
  byline?: string;
  siteName?: string;
  excerpt?: string;
  summary?: string;
  text?: string;
  wordCount?: number;
  charCount?: number;
  fetchedAt?: string;
  truncated?: boolean;
};

type BuildExplorerResearchSuggestedPathOptions = {
  preview?: ExplorerResearchPreview | null;
  targetDirPath?: string;
};

type BuildExplorerResearchMarkdownOptions = {
  note?: string;
  sourceSurface?: string;
};

type BuildExplorerResearchMemoPayloadOptions = {
  preview: ExplorerResearchPreview;
  note?: string;
  savedPath?: string;
  sourceSurface?: string;
};

function normalizeText(value: unknown) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function quoteBlock(value: string) {
  return normalizeText(value)
    .split('\n')
    .filter(Boolean)
    .map((line) => `> ${line}`)
    .join('\n');
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function buildExplorerResearchSuggestedPath({
  preview,
  targetDirPath,
}: BuildExplorerResearchSuggestedPathOptions = {}) {
  const base =
    slugify(
      normalizeText(preview?.title) || normalizeText(preview?.siteName) || 'research-capture'
    ) || 'research-capture';
  const normalizedTargetDir = String(targetDirPath || '').replace(/^\/+|\/+$/g, '');
  const parentDir = normalizedTargetDir || 'research';
  return `${parentDir}/${base}.md`;
}

export function buildExplorerResearchMarkdown(
  preview: ExplorerResearchPreview,
  { note = '', sourceSurface = 'explorer-research-lane' }: BuildExplorerResearchMarkdownOptions = {}
) {
  const trimmedNote = normalizeText(note);
  const trimmedSummary = normalizeText(preview?.summary);
  const trimmedExcerpt = normalizeText(preview?.excerpt);
  const trimmedText = normalizeText(preview?.text);

  const sections = [
    [
      `# ${normalizeText(preview?.title) || 'Research Capture'}`,
      `- Source: ${normalizeText(preview?.url)}`,
      preview?.siteName ? `- Site: ${normalizeText(preview.siteName)}` : '',
      preview?.byline ? `- Byline: ${normalizeText(preview.byline)}` : '',
      preview?.wordCount ? `- Words: ${Number(preview.wordCount)}` : '',
      preview?.fetchedAt ? `- Fetched: ${normalizeText(preview.fetchedAt)}` : '',
      `- Captured Via: ${sourceSurface}`,
    ]
      .filter(Boolean)
      .join('\n'),
    trimmedNote ? `## Handoff Note\n${trimmedNote}` : '',
    trimmedSummary ? `## Summary\n${trimmedSummary}` : '',
    trimmedExcerpt ? `## Excerpt\n${quoteBlock(trimmedExcerpt)}` : '',
    trimmedText ? `## Reader Text\n${trimmedText}` : '',
  ];

  return sections.filter(Boolean).join('\n\n');
}

export function buildExplorerResearchMemoPayload({
  preview,
  note = '',
  savedPath = '',
  sourceSurface = 'explorer-research-lane',
}: BuildExplorerResearchMemoPayloadOptions) {
  const trimmedNote = normalizeText(note);
  const summary =
    normalizeText(preview.summary) ||
    normalizeText(preview.excerpt) ||
    normalizeText(preview.title) ||
    normalizeText(preview.url);
  const body = trimmedNote ? `${trimmedNote}\n\n${summary}` : summary;
  const normalizedSavedPath = String(savedPath || '').trim();

  return {
    body,
    references: normalizedSavedPath
      ? [
          {
            system: 'workspace',
            path: normalizedSavedPath,
          },
        ]
      : [],
    meta: {
      noteType: 'excerpt',
      sourceSurface,
      source: {
        url: normalizeText(preview.url),
        title: normalizeText(preview.title),
        byline: normalizeText(preview.byline) || null,
        siteName: normalizeText(preview.siteName) || null,
        excerpt: normalizeText(preview.excerpt),
        summary: normalizeText(preview.summary),
        text: normalizeText(preview.text),
        wordCount: Number(preview.wordCount || 0),
        charCount: Number(preview.charCount || 0),
        fetchedAt: normalizeText(preview.fetchedAt) || null,
        truncated: Boolean(preview.truncated),
        note: trimmedNote || null,
      },
      workspace: normalizedSavedPath
        ? {
            path: normalizedSavedPath,
            kind: 'markdown',
          }
        : null,
    },
  };
}
