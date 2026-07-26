const { net } = require('electron');
const nodeNet = require('net');

let readabilityToolkit: { JSDOM: any; Readability: any } | null = null;

// jsdom is one of the heaviest modules to require; only excerpt fetches need it,
// so keep it off the main-process boot path.
function loadReadabilityToolkit() {
  if (!readabilityToolkit) {
    readabilityToolkit = {
      JSDOM: require('jsdom').JSDOM,
      Readability: require('@mozilla/readability').Readability,
    };
  }
  return readabilityToolkit;
}

const EXCERPT_TIMEOUT_MS = 10000;
const EXCERPT_MAX_HTML_BYTES = 2 * 1024 * 1024;
const EXCERPT_MAX_TEXT_CHARS = 20000;
const SUMMARY_MAX_CHARS = 480;

function normalizeHeaderValue(value) {
  return String(value || '').trim().toLowerCase();
}

function detectBlockedFrameAncestors(contentSecurityPolicy) {
  const normalizedPolicy = String(contentSecurityPolicy || '').trim();
  if (!normalizedPolicy) {
    return '';
  }
  const frameAncestorsDirective = normalizedPolicy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.toLowerCase().startsWith('frame-ancestors '));
  if (!frameAncestorsDirective) {
    return '';
  }

  const directiveValue = frameAncestorsDirective.slice('frame-ancestors'.length).trim().toLowerCase();
  if (!directiveValue || directiveValue === '*') {
    return '';
  }
  if (directiveValue.includes("'none'")) {
    return "Content Security Policy frame-ancestors 'none'";
  }
  if (directiveValue.includes("'self'")) {
    return "Content Security Policy frame-ancestors 'self'";
  }
  return `Content Security Policy ${frameAncestorsDirective}`;
}

function detectEmbeddingBlockReason(headers) {
  const xFrameOptions = normalizeHeaderValue(headers?.get('x-frame-options'));
  if (xFrameOptions.includes('deny')) {
    return 'X-Frame-Options DENY';
  }
  if (xFrameOptions.includes('sameorigin')) {
    return 'X-Frame-Options SAMEORIGIN';
  }

  const blockedFrameAncestors =
    detectBlockedFrameAncestors(headers?.get('content-security-policy')) ||
    detectBlockedFrameAncestors(headers?.get('content-security-policy-report-only'));
  if (blockedFrameAncestors) {
    return blockedFrameAncestors;
  }

  return '';
}

function isPrivateIpv4(parts) {
  if (parts.length !== 4) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isPrivateIpv6(value) {
  const lowered = value.toLowerCase();
  return lowered === '::1' || lowered.startsWith('fc') || lowered.startsWith('fd') || lowered.startsWith('fe80');
}

function isPrivateHost(hostname) {
  if (!hostname) {
    return true;
  }
  const lowered = hostname.toLowerCase();
  if (lowered === 'localhost' || lowered.endsWith('.localhost') || lowered.endsWith('.local')) {
    return true;
  }
  const ipVersion = nodeNet.isIP(hostname);
  if (ipVersion === 4) {
    const parts = hostname.split('.').map((chunk) => Number(chunk));
    return parts.some((part) => !Number.isFinite(part)) || isPrivateIpv4(parts);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(hostname);
  }
  return false;
}

function normalizeExcerptUrl(input) {
  const value = String(input || '').trim();
  if (!value) {
    throw new Error('URL is required.');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    parsed = new URL(`https://${value}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must start with http or https.');
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error('Local URLs are not allowed.');
  }
  return parsed.toString();
}

function clampText(value, maxChars) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { text: '', truncated: false };
  }
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }
  return { text: normalized.slice(0, maxChars), truncated: true };
}

function buildSummary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= SUMMARY_MAX_CHARS) {
    return normalized;
  }
  const sentences = normalized.match(/[^.!?]+[.!?]+/g);
  if (!sentences) {
    return `${normalized.slice(0, SUMMARY_MAX_CHARS)}...`;
  }
  let summary = '';
  for (const sentence of sentences) {
    if ((summary + sentence).length > SUMMARY_MAX_CHARS) {
      break;
    }
    summary += sentence.trim() + ' ';
  }
  summary = summary.trim();
  if (!summary) {
    return `${normalized.slice(0, SUMMARY_MAX_CHARS)}...`;
  }
  return summary;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXCERPT_TIMEOUT_MS);
  try {
    const response = await net.fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Agency/0.2',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status}).`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      throw new Error('URL did not return HTML.');
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > EXCERPT_MAX_HTML_BYTES) {
      throw new Error('Excerpt is too large.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > EXCERPT_MAX_HTML_BYTES) {
      throw new Error('Excerpt is too large.');
    }
    return {
      html: buffer.toString('utf-8'),
      embeddingBlockReason: detectEmbeddingBlockReason(response.headers),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchHilExcerpt({ url }) {
  const normalizedUrl = normalizeExcerptUrl(url);
  const { JSDOM, Readability } = loadReadabilityToolkit();
  const { html, embeddingBlockReason } = await fetchHtml(normalizedUrl);
  const dom = new JSDOM(html, { url: normalizedUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const fallbackText = dom.window.document.body ? dom.window.document.body.textContent || '' : '';
  dom.window.close();
  const rawText = article?.textContent || fallbackText || '';
  const { text, truncated } = clampText(rawText, EXCERPT_MAX_TEXT_CHARS);
  const summarySource = article?.excerpt || text;
  const summary = buildSummary(summarySource);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const hostname = new URL(normalizedUrl).hostname;

  return {
    url: normalizedUrl,
    title: article?.title || '',
    byline: article?.byline || '',
    siteName: article?.siteName || hostname,
    excerpt: article?.excerpt || '',
    summary,
    text,
    wordCount,
    charCount: text.length,
    fetchedAt: new Date().toISOString(),
    truncated,
    liveViewAllowed: !embeddingBlockReason,
    liveViewBlockReason: embeddingBlockReason || '',
  };
}

export {
  detectEmbeddingBlockReason,
  fetchHilExcerpt,
  EXCERPT_MAX_TEXT_CHARS,
  normalizeExcerptUrl,
};
