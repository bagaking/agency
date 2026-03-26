// @ts-nocheck
function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function buildSkillPackPrompt({ run, step, skillPack, preparedContext, providerId }) {
  const title = String(skillPack?.title || step?.title || step?.id || 'Harness Step').trim();
  const instruction = String(skillPack?.instruction || '').trim();
  const rules = Array.isArray(skillPack?.rules) ? skillPack.rules : [];
  const capabilityNotes = Array.isArray(skillPack?.allowedCapabilities)
    ? skillPack.allowedCapabilities.map((capabilityId) => `- ${capabilityId}`)
    : [];
  const context = {
    providerId: String(providerId || '').trim(),
    runId: String(run?.runId || '').trim(),
    goal: run?.goal || null,
    step: {
      id: step?.id || '',
      kind: step?.kind || '',
      title: step?.title || '',
      skillPackId: step?.skillPackId || '',
      agent: step?.agent || {},
    },
    preparedContext: preparedContext || {},
  };

  return [
    `You are the planning layer for Agency Main Agent Harness.`,
    `Your task is to produce a structured decision for one bounded skill pack step.`,
    `Step Title: ${title}`,
    instruction ? `Skill Pack Instruction:\n${instruction}` : '',
    capabilityNotes.length
      ? `Allowed host-managed capabilities:\n${capabilityNotes.join('\n')}`
      : '',
    rules.length ? `Hard Rules:\n${rules.map((rule) => `- ${rule}`).join('\n')}` : '',
    `Return JSON only and obey the provided schema exactly.`,
    `Do not assume direct access to tmux, files, or the browser. All real side effects must happen through allowed host-managed capabilities only.`,
    `Decision Context:\n${stableStringify(context)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

module.exports = {
  buildSkillPackPrompt,
};
