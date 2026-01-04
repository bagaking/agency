const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildActionSheetCompletion = (sheetId) => {
  const id = String(sheetId || '').trim();
  const planPath = `.agency/action-sheets/${id}/plan.md`;
  const marker = `Completion marker: ${id}`;
  const done = [
    'When the work is finished, update the completion checklist line below.',
    `File: ${planPath}`,
    `- [x] ${marker}`,
  ].join('\n');
  const checkCommand = `rg -n "^\\- \\[x\\] ${escapeRegex(marker)}$" ${planPath}`;
  return {
    planPath,
    marker,
    done,
    checks: [
      {
        label: 'Completion marker',
        commands: [checkCommand],
      },
    ],
  };
};

export const buildActionSheetPlan = ({ title, marker }) => {
  const planTitle = String(title || 'Action Sheet');
  const completionMarker = String(marker || 'Completion marker');
  return [
    `# ${planTitle}`,
    '',
    '## Checklist',
    '- [ ] Review requirements',
    '- [ ] Run in session',
    '',
    '## Completion',
    `- [ ] ${completionMarker}`,
    '',
  ].join('\n');
};
