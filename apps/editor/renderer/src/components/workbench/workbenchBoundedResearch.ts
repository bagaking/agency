export const WORKBENCH_TAB_KIND_BOUNDED_WEB_RESEARCH = 'bounded-web-research';

export const DEFAULT_WORKBENCH_RESEARCH_TAB_TITLE = 'Web Research';

export type WorkbenchBoundedResearchTab = {
  id: string;
  kind: typeof WORKBENCH_TAB_KIND_BOUNDED_WEB_RESEARCH;
  title: string;
  rootPath: string;
  isPreview: boolean;
  url: string;
};

export function normalizeWorkbenchResearchUrl(input: unknown) {
  const value = String(input || '').trim();
  if (!value) {
    return '';
  }
  const candidate = value.includes('://') ? value : `https://${value}`;
  try {
    return new URL(candidate).toString();
  } catch (_error) {
    return value;
  }
}

export function deriveWorkbenchResearchTitle(url: unknown, fallback = DEFAULT_WORKBENCH_RESEARCH_TAB_TITLE) {
  const normalizedUrl = normalizeWorkbenchResearchUrl(url);
  if (!normalizedUrl) {
    return fallback;
  }
  try {
    const parsed = new URL(normalizedUrl);
    return parsed.hostname || fallback;
  } catch (_error) {
    return normalizedUrl;
  }
}

export function buildWorkbenchResearchTabId(cellId: string, rootPath: string, url: string) {
  return `${cellId}::${rootPath}::${WORKBENCH_TAB_KIND_BOUNDED_WEB_RESEARCH}::${normalizeWorkbenchResearchUrl(url)}`;
}

export function isWorkbenchBoundedResearchTab(tab: any) {
  return tab?.kind === WORKBENCH_TAB_KIND_BOUNDED_WEB_RESEARCH;
}

export function buildWorkbenchBoundedResearchTab({
  cellId,
  rootPath,
  url,
  title,
  isPreview = false,
}: {
  cellId: string;
  rootPath: string;
  url: string;
  title?: string;
  isPreview?: boolean;
}): WorkbenchBoundedResearchTab {
  const normalizedUrl = normalizeWorkbenchResearchUrl(url);
  return {
    id: buildWorkbenchResearchTabId(cellId, rootPath, normalizedUrl),
    kind: WORKBENCH_TAB_KIND_BOUNDED_WEB_RESEARCH,
    title: String(title || '').trim() || deriveWorkbenchResearchTitle(normalizedUrl),
    rootPath,
    isPreview: Boolean(isPreview),
    url: normalizedUrl,
  };
}
