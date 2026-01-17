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

export function buildActionSheetDispatchText({ id, title }) {
  const sheetId = normalizeSection(id);
  const label = normalizeSection(title) || sheetId || 'Action Sheet';
  if (!sheetId) {
    return `Action Sheet "${label}": open the prompt.json and plan.md under .agency/action-sheets and follow the instructions.`;
  }
  const promptPath = `.agency/action-sheets/${sheetId}/prompt.json`;
  const planPath = `.agency/action-sheets/${sheetId}/plan.md`;
  return `Action Sheet "${label}": open ${promptPath} and ${planPath}, confirm the plan, follow requirements, then check off the completion marker in plan.md.`;
}
