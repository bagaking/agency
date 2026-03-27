// @ts-nocheck
const { createSessionCreateChildSkillPack } = require('./sessionCreateChild');
const { createSessionSmartNameSkillPack } = require('./sessionSmartName');
const { createSessionToolNativeForkSkillPack } = require('./sessionToolNativeFork');

function normalizeStrategy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'tool_native_fork') {
    return 'tool_native_fork';
  }
  return 'create_child';
}

function createRunnerSkillPackRegistry({
  skillPacks = [
    createSessionCreateChildSkillPack(),
    createSessionSmartNameSkillPack(),
    createSessionToolNativeForkSkillPack(),
  ],
} = {}) {
  const skillPackMap = new Map(
    (Array.isArray(skillPacks) ? skillPacks : [])
      .filter(Boolean)
      .map((skillPack) => [String(skillPack.id || '').trim(), skillPack])
  );

  return {
    resolve(step = {}) {
      const explicitId = String(step?.skillPackId || '').trim();
      if (explicitId && skillPackMap.has(explicitId)) {
        return skillPackMap.get(explicitId);
      }
      const strategy = normalizeStrategy(step?.agent?.strategy);
      if (strategy === 'tool_native_fork') {
        return skillPackMap.get('session.tool-native-fork') || null;
      }
      return skillPackMap.get('session.create-child') || null;
    },
    list() {
      return Array.from(skillPackMap.values()).map((item) => ({
        id: item.id,
        title: item.title,
        allowedCapabilities: item.allowedCapabilities || [],
      }));
    },
  };
}

module.exports = {
  createRunnerSkillPackRegistry,
};
