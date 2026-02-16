const SCOPE_ORDER = ['global', 'project', 'agent'];

export const scopeLabelMap = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

export const normalizePromptText = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

export const generateReplyPromptId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `reply-prompt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

export const normalizePromptItem = (item) => {
  if (typeof item === 'string') {
    const text = normalizePromptText(item);
    if (!text) {
      return null;
    }
    return {
      id: generateReplyPromptId(),
      title: '',
      text,
      enabled: true,
    };
  }
  if (!item || typeof item !== 'object') {
    return null;
  }
  const text = normalizePromptText(item.text);
  if (!text) {
    return null;
  }
  return {
    id: item.id || generateReplyPromptId(),
    title: String(item.title || '').trim(),
    text,
    enabled: item.enabled !== false,
  };
};

export const normalizePromptList = (value) =>
  (Array.isArray(value) ? value : [])
    .map(normalizePromptItem)
    .filter(Boolean);

export const resolveReplyQuickPrompts = ({
  globalPrompts = [],
  projectPrompts = [],
  agentPrompts = [],
}: any = {}) => {
  const scopesByName = {
    global: normalizePromptList(globalPrompts),
    project: normalizePromptList(projectPrompts),
    agent: normalizePromptList(agentPrompts),
  };
  const resolved = [];
  const indexByText = new Map();

  SCOPE_ORDER.forEach((scope) => {
    const prompts = scopesByName[scope] || [];
    prompts.forEach((prompt) => {
      if (prompt.enabled === false) {
        return;
      }
      const key = normalizePromptText(prompt.text);
      if (!key) {
        return;
      }
      if (indexByText.has(key)) {
        const existing = resolved[indexByText.get(key)];
        if (!existing.sources.includes(scope)) {
          existing.sources.push(scope);
        }
        return;
      }
      indexByText.set(key, resolved.length);
      resolved.push({
        ...prompt,
        text: key,
        sources: [scope],
      });
    });
  });

  return resolved;
};
