export const resolveSpeechRecognition = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const mapSpeechError = (error) => {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Enable access in System Settings.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'no-speech':
      return 'No speech was detected.';
    case 'aborted':
      return 'Voice input was stopped.';
    case 'network':
      return 'Network error while recognizing speech. Check connectivity or VPN.';
    default:
      return 'Voice input failed.';
  }
};

export const normalizeLanguage = (value) => {
  if (value && String(value).trim()) {
    return String(value).trim();
  }
  return '';
};

export const resolveLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  if (normalized && normalized !== 'auto') {
    return normalized;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

export const buildLanguageOptions = () => {
  const entries = [];
  const seen = new Set();
  const add = (value) => {
    const normalized = normalizeLanguage(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    entries.push(normalized);
  };

  add('auto');
  if (typeof navigator !== 'undefined') {
    (navigator.languages || []).forEach(add);
    add(navigator.language);
  }
  add('en-US');
  add('zh-CN');

  return entries;
};

export const resolvePermissionKind = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes('speech')) {
    return 'speech';
  }
  if (normalized.includes('microphone') || normalized.includes('mic')) {
    return 'microphone';
  }
  if (normalized.includes('not-allowed') || normalized.includes('permission')) {
    return 'microphone';
  }
  return null;
};
