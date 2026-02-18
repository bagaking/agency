import { normalizeDeliveryMode, type DeliveryMode } from '../utils/deliveryMetadata';

type ExplorerDeliveryPromptInput = {
  description: string;
  context: string;
  mode?: DeliveryMode | string;
  requestedAt?: string;
  sessionId?: string;
  references?: Array<{ path?: string | null }>;
};

export const buildExplorerDeliveryPromptText = ({
  description,
  context,
  mode = 'quick',
  requestedAt = '',
  sessionId = '',
  references = [],
}: ExplorerDeliveryPromptInput) => {
  const normalizedMode = normalizeDeliveryMode(mode);
  const referenceLines = (Array.isArray(references) ? references : [])
    .map((entry) => String(entry?.path || '').trim())
    .filter(Boolean);
  const lines = ['<delivery>'];
  lines.push('source: explorer');
  lines.push(`mode: ${normalizedMode}`);
  if (sessionId) {
    lines.push(`session_id: ${sessionId}`);
  }
  if (requestedAt) {
    lines.push(`requested_at: ${requestedAt}`);
  }
  if (referenceLines.length) {
    lines.push('references:');
    referenceLines.forEach((path) => lines.push(`- ${path}`));
  }
  lines.push('</delivery>');
  lines.push('');
  lines.push('<context>');
  if (context) {
    lines.push(context);
  } else {
    lines.push('- No explicit file selection context.');
  }
  lines.push('</context>');
  lines.push('<query>');
  lines.push(description || 'Review selected files.');
  lines.push('</query>');
  return lines.join('\n');
};

