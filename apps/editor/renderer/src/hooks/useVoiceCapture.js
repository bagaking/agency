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
      return 'Network error while recognizing speech.';
    default:
      return 'Voice input failed.';
  }
};

const resolveLanguage = (language) => {
  if (language && String(language).trim()) {
    return String(language).trim();
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

export function useVoiceCapture({ language, onFinal }) {
  const recognitionRef = useRef(null);
  const statusRef = useRef('idle');
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState('');

  const setStatusSafe = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  useEffect(() => {
    const available = Boolean(resolveSpeechRecognition());
    setSupported(available);
    setStatusSafe(available ? 'idle' : 'unavailable');
  }, [setStatusSafe]);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = resolveSpeechRecognition();
    if (!SpeechRecognition) {
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError('');
      setInterimText('');
      setFinalText('');
      setStatusSafe('recording');
    };

    recognition.onerror = (event) => {
      const message = mapSpeechError(event?.error);
      setError(message);
      setStatusSafe('error');
      logRuntime?.({
        level: 'warn',
        message: 'voice capture error',
        meta: {
          error: event?.error || null,
          message,
        },
      });
    };

    recognition.onend = () => {
      if (statusRef.current === 'recording' || statusRef.current === 'starting') {
        setStatusSafe('idle');
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
  }, [onFinal, setStatusSafe]);

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
    recognition.lang = resolveLanguage(language);
    setStatusSafe('starting');
    try {
      recognition.start();
    } catch (startError) {
      const message = startError?.message || 'Unable to start voice input.';
      setError(message);
      setStatusSafe('error');
      logRuntime?.({
        level: 'warn',
        message: 'voice capture start failed',
        meta: {
          error: message,
        },
      });
    }
  }, [createRecognition, language, setStatusSafe, supported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    try {
      recognitionRef.current.stop();
    } catch (stopError) {
      logRuntime?.({
        level: 'warn',
        message: 'voice capture stop failed',
        meta: {
          error: stopError?.message || String(stopError),
        },
      });
    }
  }, []);

  const reset = useCallback(() => {
    setInterimText('');
    setFinalText('');
    setError('');
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
    if (status === 'error') {
      return error || 'Voice input failed.';
    }
    return 'Ready for voice input.';
  }, [error, status]);

  return {
    supported,
    status,
    isRecording,
    interimText,
    finalText,
    error,
    statusMessage,
    start,
    stop,
    reset,
  };
}
