import * as sessionNamingCoreModule from '../../../shared/sessionNamingCore.cjs';

const sessionNamingCore =
  sessionNamingCoreModule.default ||
  sessionNamingCoreModule.__AGENCY_SESSION_NAMING_CORE__ ||
  globalThis?.__AGENCY_SESSION_NAMING_CORE__ ||
  sessionNamingCoreModule;


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
