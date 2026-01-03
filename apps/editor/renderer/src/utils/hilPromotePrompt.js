const formatAnchorLabel = (anchor) => {
  if (!anchor?.file) {
    return '';
  }
  const line = anchor.line ? `:${anchor.line}` : '';
  return `${anchor.file}${line}`;
};

const normalizeSnippet = (snippet) => {
  if (!Array.isArray(snippet)) {
    return [];
  }
  return snippet.map((line) => ({
    line: line.line,
    text: line.text || '',
  }));
};

export function buildPromotePromptBundle({ description, items, previewById }) {
  const timestamp = new Date().toISOString();
  const bundleItems = (items || []).map((item) => {
    const preview = previewById?.[item.id];
    return {
      id: item.id,
      kind: item.kind || 'comment',
      body: item.body || item.message || '',
      anchor: item.anchor || null,
      references: item.references || [],
      snippet: normalizeSnippet(preview?.snippet),
    };
  });
  return {
    description: description || '',
    createdAt: timestamp,
    items: bundleItems,
  };
}

export function buildPromotePromptText(bundle) {
  if (!bundle) {
    return '';
  }
  const lines = [];
  lines.push('<context>');
  if (bundle.description) {
    lines.push(`Draft: ${bundle.description}`);
  }
  if (bundle.items?.length) {
    lines.push('Items:');
    bundle.items.forEach((item) => {
      const label = formatAnchorLabel(item.anchor);
      lines.push(`- [${item.kind}] ${item.body || '(empty)'}${label ? ` (${label})` : ''}`);
      if (item.snippet?.length) {
        item.snippet.forEach((snippetLine) => {
          const lineNo = snippetLine.line ? `${snippetLine.line}`.padStart(4, ' ');
          lines.push(`    ${lineNo} | ${snippetLine.text}`);
        });
      }
    });
  }
  lines.push('</context>');
  lines.push('<query>');
  lines.push('Convert the selected items into a structured draft. Update the draft metadata when complete.');
  lines.push('</query>');
  return lines.join('\n');
}
