import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logRuntime } from '../services/agencyBridge.js';

const resolveSpeechRecognition = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const mapSpeechError = (error) => {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied.';
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

const normalizeLanguage = (value) => {
  if (value && String(value).trim()) {
    return String(value).trim();
  }
  return '';
};

const resolveLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  if (normalized && normalized !== 'auto') {
    return normalized;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

const buildLanguageOptions = () => {
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

export function useVoiceCapture({ language: initialLanguage, onFinal }) {
  const recognitionRef = useRef(null);
  const statusRef = useRef('idle');
  const stopRequestedRef = useRef(false);
  const lastErrorRef = useRef('');
  const restartRef = useRef({ attempts: 0, lastAt: 0 });
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(() => normalizeLanguage(initialLanguage) || 'auto');

  const setStatusSafe = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  useEffect(() => {
    if (!initialLanguage) {
      return;
    }
    setLanguage(normalizeLanguage(initialLanguage) || 'auto');
  }, [initialLanguage]);

  useEffect(() => {
    const available = Boolean(resolveSpeechRecognition());
    setSupported(available);
    setStatusSafe(available ? 'idle' : 'unavailable');
  }, [setStatusSafe]);

  const resolvedLanguage = useMemo(() => resolveLanguage(language), [language]);
  const languageOptions = useMemo(() => buildLanguageOptions(), []);

  const buildDiagnostics = useCallback(
    () => ({
      origin: typeof window !== 'undefined' ? window.location.origin : null,
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
      navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      languages: typeof navigator !== 'undefined' ? navigator.languages : null,
      language,
      resolvedLanguage,
    }),
    [language, resolvedLanguage]
  );

  const createRecognition = useCallback(() => {
    const SpeechRecognition = resolveSpeechRecognition();
    if (!SpeechRecognition) {
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError('');
      setInterimText('');
      setFinalText('');
      lastErrorRef.current = '';
      restartRef.current = { attempts: 0, lastAt: 0 };
      setStatusSafe('recording');
    };

    recognition.onerror = (event) => {
      const message = mapSpeechError(event?.error);
      setError(message);
      setStatusSafe('error');
      lastErrorRef.current = event?.error || message;
      stopRequestedRef.current = true;
      logRuntime?.({
        level: 'warn',
        message: 'voice capture error',
        meta: {
          error: event?.error || null,
          message,
          ...buildDiagnostics(),
        },
      });
    };

    recognition.onend = () => {
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        setStatusSafe('idle');
        setInterimText('');
        return;
      }
      if (lastErrorRef.current) {
        setInterimText('');
        return;
      }
      if (statusRef.current === 'recording' || statusRef.current === 'starting') {
        const now = Date.now();
        const resetWindowMs = 15000;
        const state = restartRef.current;
        const attempts = now - state.lastAt > resetWindowMs ? 0 : state.attempts;
        if (attempts >= 2) {
          setError('Voice input stopped unexpectedly.');
          setStatusSafe('error');
          return;
        }
        restartRef.current = { attempts: attempts + 1, lastAt: now };
        setStatusSafe('starting');
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (restartError) {
              setError(restartError?.message || 'Unable to restart voice input.');
              setStatusSafe('error');
              logRuntime?.({
                level: 'warn',
                message: 'voice capture restart failed',
                meta: {
                  error: restartError?.message || String(restartError),
                  ...buildDiagnostics(),
                },
              });
            }
          }
        }, 240);
      }
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || '';
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setInterimText(interim.trim());
      } else {
        setInterimText('');
      }
      const normalizedFinal = String(finalChunk || '').trim();
      if (normalizedFinal) {
        setFinalText((current) => (current ? `${current} ${normalizedFinal}` : normalizedFinal));
        onFinal?.(normalizedFinal);
      }
    };

    return recognition;
  }, [buildDiagnostics, onFinal, setStatusSafe]);

  const start = useCallback(() => {
    if (!supported) {
      setError('Voice input is not supported in this environment.');
      setStatusSafe('unavailable');
      return;
    }
    if (statusRef.current === 'recording' || statusRef.current === 'starting') {
      return;
    }
    const recognition = recognitionRef.current || createRecognition();
    if (!recognition) {
      setError('Voice input is not supported in this environment.');
      setStatusSafe('unavailable');
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = resolvedLanguage;
    stopRequestedRef.current = false;
    lastErrorRef.current = '';
    setStatusSafe('starting');
    try {
      recognition.start();
    } catch (startError) {
      const message = startError?.message || 'Unable to start voice input.';
      setError(message);
      setStatusSafe('error');
      lastErrorRef.current = message;
      logRuntime?.({
        level: 'warn',
        message: 'voice capture start failed',
        meta: {
          error: message,
          ...buildDiagnostics(),
        },
      });
    }
  }, [buildDiagnostics, createRecognition, resolvedLanguage, setStatusSafe, supported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    stopRequestedRef.current = true;
    setStatusSafe('stopping');
    try {
      recognitionRef.current.stop();
    } catch (stopError) {
      logRuntime?.({
        level: 'warn',
        message: 'voice capture stop failed',
        meta: {
          error: stopError?.message || String(stopError),
          ...buildDiagnostics(),
        },
      });
    }
  }, [buildDiagnostics, setStatusSafe]);

  const reset = useCallback(() => {
    setInterimText('');
    setFinalText('');
    setError('');
    lastErrorRef.current = '';
    if (statusRef.current !== 'unavailable') {
      setStatusSafe('idle');
    }
  }, [setStatusSafe]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort?.();
        } catch (error) {
          // Ignore teardown errors.
        }
      }
      recognitionRef.current = null;
    };
  }, []);

  const isRecording = status === 'recording' || status === 'starting';
  const statusMessage = useMemo(() => {
    if (status === 'unavailable') {
      return 'Voice input is unavailable.';
    }
    if (status === 'starting') {
      return 'Starting voice capture...';
    }
    if (status === 'recording') {
      return 'Listening...';
    }
    if (status === 'stopping') {
      return 'Stopping...';
    }
    if (status === 'error') {
      return error || 'Voice input failed.';
    }
    return 'Ready for voice input.';
  }, [error, status]);

  return {
    supported,
    status,
    isRecording,
    language,
    languageOptions,
    resolvedLanguage,
    setLanguage,
    interimText,
    finalText,
    error,
    statusMessage,
    start,
    stop,
    reset,
  };
}
