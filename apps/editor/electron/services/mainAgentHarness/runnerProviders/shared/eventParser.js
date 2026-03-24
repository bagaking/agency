// @ts-nocheck
function stripCodeFences(value) {
  const text = String(value || '').trim();
  if (!text.startsWith('```')) {
    return text;
  }
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseJsonlOutput(output = '') {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return {
          type: 'raw',
          raw: line,
        };
      }
    });
}

function extractProviderDecision(events = []) {
  const threadId =
    events.find((event) => event?.type === 'thread.started')?.thread_id || '';
  const agentMessageEvents = events.filter(
    (event) =>
      event?.type === 'item.completed' &&
      event?.item?.type === 'agent_message' &&
      String(event?.item?.text || '').trim()
  );
  const finalText = agentMessageEvents.length
    ? String(agentMessageEvents[agentMessageEvents.length - 1].item.text || '').trim()
    : '';
  if (!finalText) {
    const error = new Error('Provider did not return a final agent message.');
    error.code = 'PROVIDER_NO_RESULT';
    throw error;
  }
  const normalizedText = stripCodeFences(finalText);
  try {
    return {
      threadId: String(threadId || '').trim(),
      rawText: finalText,
      decision: JSON.parse(normalizedText),
    };
  } catch (parseError) {
    const error = new Error('Provider returned invalid JSON decision.');
    error.code = 'PROVIDER_INVALID_JSON';
    error.data = {
      threadId: String(threadId || '').trim(),
      rawText: finalText,
    };
    throw error;
  }
}

module.exports = {
  extractProviderDecision,
  parseJsonlOutput,
};
