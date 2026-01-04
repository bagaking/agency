const normalizeSection = (value) => String(value || '').trim();

export function buildActionSheetPromptText(prompt = {}) {
  const requirements = normalizeSection(prompt.requirements);
  const context = normalizeSection(prompt.context);
  const checks = normalizeSection(prompt.checks);
  const done = normalizeSection(prompt.done);
  return [
    '<requirements>',
    requirements,
    '</requirements>',
    '<context>',
    context,
    '</context>',
    '<checks>',
    checks,
    '</checks>',
    '<done>',
    done,
    '</done>',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
