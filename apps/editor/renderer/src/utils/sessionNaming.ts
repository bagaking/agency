import sessionNamingCore from '../../../shared/sessionNamingCore';

if (!sessionNamingCore || typeof sessionNamingCore.formatSessionName !== 'function') {
  throw new Error('sessionNamingCore failed to load in renderer runtime.');
}

const {
  DEFAULT_RULE,
  DEFAULT_NAME_LISTS,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  normalizeSettings,
  resolveSessionNaming,
  formatSessionName,
} = sessionNamingCore;

export {
  DEFAULT_RULE,
  DEFAULT_NAME_LISTS,
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS,
  normalizeSettings,
  resolveSessionNaming,
  formatSessionName,
};
