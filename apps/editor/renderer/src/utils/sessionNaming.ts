import * as sessionNamingCoreModule from '../../../shared/sessionNamingCore.cjs';

const sessionNamingCoreAny = sessionNamingCoreModule as any;
const sessionNamingCore =
  sessionNamingCoreAny.default ||
  sessionNamingCoreAny.__AGENCY_SESSION_NAMING_CORE__ ||
  (globalThis as any)?.__AGENCY_SESSION_NAMING_CORE__ ||
  sessionNamingCoreAny;


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
