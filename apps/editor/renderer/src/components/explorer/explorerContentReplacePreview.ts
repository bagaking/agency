const escapeRegex = (value: string) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPattern = ({
  query,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
}: {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
}) => {
  const rawQuery = String(query || '').trim();
  if (!rawQuery) {
    return null;
  }
  const source = useRegex ? rawQuery : escapeRegex(rawQuery);
  const pattern = wholeWord ? `\\b(?:${source})\\b` : source;
  try {
    return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  } catch (_error) {
    return null;
  }
};

export function buildExplorerContentReplacePreview({
  snippet,
  query,
  replacement,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
}: {
  snippet: string;
  query: string;
  replacement: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
}) {
  const normalizedSnippet = String(snippet || '');
  if (!normalizedSnippet || !String(query || '').trim()) {
    return '';
  }
  const pattern = buildPattern({
    query,
    caseSensitive,
    wholeWord,
    useRegex,
  });
  if (!pattern) {
    return '';
  }
  const preview = normalizedSnippet.replace(pattern, replacement);
  if (preview === normalizedSnippet) {
    return '';
  }
  return preview;
}
