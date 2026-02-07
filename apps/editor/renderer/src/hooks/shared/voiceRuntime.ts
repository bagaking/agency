export type PermissionKind = 'speech' | 'microphone' | null;

export const resolveSpeechRecognition = (): any => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const mapSpeechError = (error: string | undefined): string => {
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

export const normalizeLanguage = (value: unknown): string => {
  if (value && String(value).trim()) {
    return String(value).trim();
  }
  return '';
};

export const resolveLanguage = (language: string): string => {
  const normalized = normalizeLanguage(language);
  if (normalized && normalized !== 'auto') {
    return normalized;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

export const buildLanguageOptions = (): string[] => {
  const entries: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
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

export const resolvePermissionKind = (value: unknown): PermissionKind => {
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
