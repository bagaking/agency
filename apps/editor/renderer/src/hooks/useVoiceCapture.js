import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  logRuntime,
  getVoiceCaptureSupport,
  startVoiceCapture,
  stopVoiceCapture,
  discardVoiceCaptureAudio,
  onVoiceCaptureEvent,
} from '../services/agencyBridge.js';

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

const logVoiceDiagnostics = ({ level = 'warn', message, meta }) => {
  if (typeof console !== 'undefined' && console[level]) {
    console[level](`[voice capture] ${message}`, meta);
  }
  logRuntime?.({ level, message, meta });
};

export function useVoiceCapture({ language: initialLanguage, onFinal }) {
  const recognitionRef = useRef(null);
  const statusRef = useRef('idle');
  const stopRequestedRef = useRef(false);
  const nativeCaptureIdRef = useRef('');
  const nativeActiveRef = useRef(false);
  const lastInterimRef = useRef('');
  const lastFinalRef = useRef('');
  const lastErrorRef = useRef('');
  const restartRef = useRef({ attempts: 0, lastAt: 0 });
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const mediaStartRef = useRef(0);
  const [audio, setAudio] = useState(null);
  const [rescoreMessage, setRescoreMessage] = useState('');
  const [webSupported, setWebSupported] = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);
  const [status, setStatus] = useState('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(() => normalizeLanguage(initialLanguage) || 'auto');
  const supported = webSupported || nativeSupported;

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
    setWebSupported(available);
    logVoiceDiagnostics({
      level: 'info',
      message: 'web speech support checked',
      meta: {
        supported: available,
      },
    });
  }, []);

  useEffect(() => {
    let active = true;
    const fetchSupport = async () => {
      const result = await getVoiceCaptureSupport?.();
      if (!active) {
        return;
      }
      setNativeSupported(Boolean(result?.supported));
      logVoiceDiagnostics({
        level: 'info',
        message: 'native speech support checked',
        meta: {
          supported: Boolean(result?.supported),
          reason: result?.reason || null,
        },
      });
    };
    fetchSupport();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supported) {
      setStatusSafe('unavailable');
      logVoiceDiagnostics({
        level: 'warn',
        message: 'voice capture unavailable',
        meta: {
          webSupported,
          nativeSupported,
        },
      });
      return;
    }
    if (statusRef.current === 'unavailable') {
      setStatusSafe('idle');
    }
  }, [nativeSupported, setStatusSafe, supported, webSupported]);

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

  const buildAssetUrl = useCallback((filePath) => {
    if (!filePath) {
      return '';
    }
    return `agency-asset://${filePath}`;
  }, []);

  const clearAudio = useCallback(async () => {
    if (audio?.path) {
      await discardVoiceCaptureAudio?.({ sourcePath: audio.path });
    }
    setAudio(null);
  }, [audio?.path, discardVoiceCaptureAudio]);

  const handleNativeEvent = useCallback(
    (payload) => {
      if (!payload || payload.captureId !== nativeCaptureIdRef.current) {
        return;
      }
      logVoiceDiagnostics({
        level: payload.type === 'error' ? 'warn' : 'info',
        message: 'native voice event',
        meta: {
          type: payload.type,
          status: payload.status || null,
          message: payload.message || null,
          reason: payload.reason || null,
          language: payload.language || null,
          code: payload.code ?? null,
          signal: payload.signal ?? null,
        },
      });
      if (payload.type === 'debug') {
        const stage = payload.data?.stage;
        if (stage === 'rescore-start') {
          setRescoreMessage(payload.data?.locale || 'auto');
        } else if (stage === 'rescore-done') {
          setRescoreMessage('');
        }
        return;
      }
      if (payload.type === 'status') {
        if (payload.status === 'recording') {
          setStatusSafe('recording');
        } else if (payload.status === 'starting') {
          setStatusSafe('starting');
        } else if (payload.status === 'stopping') {
          setStatusSafe('stopping');
        } else if (payload.status === 'stopped') {
          nativeActiveRef.current = false;
          nativeCaptureIdRef.current = '';
          if (statusRef.current !== 'error') {
            setStatusSafe('idle');
          }
          setRescoreMessage('');
          if (lastInterimRef.current) {
            const fallback = lastInterimRef.current;
            lastInterimRef.current = '';
            if (fallback && fallback !== lastFinalRef.current) {
              onFinal?.(fallback);
            }
          }
          setInterimText('');
        }
      }
      if (payload.type === 'partial') {
        const text = String(payload.text || '').trim();
        lastInterimRef.current = text;
        setInterimText(text);
        return;
      }
      if (payload.type === 'final') {
        const text = String(payload.text || '').trim();
        lastInterimRef.current = '';
        lastFinalRef.current = text;
        setInterimText('');
        if (text) {
          onFinal?.(text);
        }
        return;
      }
      if (payload.type === 'audio') {
        if (!payload.path) {
          return;
        }
        setAudio({
          path: payload.path,
          mime: payload.mime || 'audio/wav',
          durationMs: payload.durationMs ?? null,
          backend: 'native',
          previewUrl: buildAssetUrl(payload.path),
        });
        return;
      }
      if (payload.type === 'error') {
        nativeActiveRef.current = false;
        nativeCaptureIdRef.current = '';
        setError(payload.message || 'Voice input failed.');
        setStatusSafe('error');
      }
    },
    [buildAssetUrl, onFinal, setStatusSafe]
  );

  useEffect(() => {
    if (!onVoiceCaptureEvent) {
      logVoiceDiagnostics({
        level: 'warn',
        message: 'voice capture event subscription unavailable',
      });
      return undefined;
    }
    const unsubscribe = onVoiceCaptureEvent?.(handleNativeEvent);
    logVoiceDiagnostics({
      level: 'info',
      message: 'voice capture event subscription ready',
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [handleNativeEvent]);

  const startWebAudioCapture = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      return null;
    }
    if (typeof window.MediaRecorder === 'undefined') {
      return null;
    }
    if (mediaRecorderRef.current) {
      return mediaRecorderRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      let mimeType = '';
      mimeType =
        preferredTypes.find((type) => window.MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaChunksRef.current = [];
      mediaStartRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const chunks = mediaChunksRef.current;
        mediaChunksRef.current = [];
        if (!chunks.length) {
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) {
            return;
          }
          setAudio({
            dataUrl,
            mime: recorder.mimeType || 'audio/webm',
            durationMs: Date.now() - (mediaStartRef.current || Date.now()),
            backend: 'web',
            previewUrl: dataUrl,
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      return recorder;
    } catch (error) {
      logVoiceDiagnostics({
        level: 'warn',
        message: 'voice capture audio recording failed',
        meta: {
          error: error?.message || String(error),
          ...buildDiagnostics(),
        },
      });
      return null;
    }
  }, [buildDiagnostics]);

  const stopWebAudioCapture = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

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
      stopWebAudioCapture();
      logVoiceDiagnostics({
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
              logVoiceDiagnostics({
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
        onFinal?.(normalizedFinal);
      }
    };

    return recognition;
  }, [buildDiagnostics, onFinal, setStatusSafe, stopWebAudioCapture]);

  const startWebSpeech = useCallback(() => {
    if (!webSupported) {
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
    startWebAudioCapture();
    setStatusSafe('starting');
    try {
      recognition.start();
    } catch (startError) {
      const message = startError?.message || 'Unable to start voice input.';
      setError(message);
      setStatusSafe('error');
      lastErrorRef.current = message;
      logVoiceDiagnostics({
        level: 'warn',
        message: 'voice capture start failed',
        meta: {
          error: message,
          ...buildDiagnostics(),
        },
      });
    }
  }, [buildDiagnostics, createRecognition, resolvedLanguage, setStatusSafe, startWebAudioCapture, webSupported]);

  const stopWebSpeech = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    stopRequestedRef.current = true;
    setStatusSafe('stopping');
    try {
      recognitionRef.current.stop();
    } catch (stopError) {
      logVoiceDiagnostics({
        level: 'warn',
        message: 'voice capture stop failed',
        meta: {
          error: stopError?.message || String(stopError),
          ...buildDiagnostics(),
        },
      });
    }
    stopWebAudioCapture();
  }, [buildDiagnostics, setStatusSafe, stopWebAudioCapture]);

  const startNativeSpeech = useCallback(async () => {
    if (!nativeSupported) {
      return false;
    }
    if (statusRef.current === 'recording' || statusRef.current === 'starting') {
      return true;
    }
    try {
      const nativeLanguage = language === 'auto' ? 'auto' : resolvedLanguage;
      const result = await startVoiceCapture?.({ language: nativeLanguage });
      logVoiceDiagnostics({
        level: 'info',
        message: 'native voice capture start response',
        meta: {
          result: result || null,
        },
      });
      if (!result?.supported || !result?.captureId) {
        logVoiceDiagnostics({
          level: 'warn',
          message: 'native voice capture unavailable',
          meta: {
            reason: result?.reason || 'unsupported',
            ...buildDiagnostics(),
          },
        });
        return false;
      }
      nativeCaptureIdRef.current = result.captureId;
      nativeActiveRef.current = true;
      setError('');
      setInterimText('');
      lastInterimRef.current = '';
      lastFinalRef.current = '';
      setStatusSafe('starting');
      return true;
    } catch (error) {
      logVoiceDiagnostics({
        level: 'warn',
        message: 'native voice capture start failed',
        meta: {
          error: error?.message || String(error),
          ...buildDiagnostics(),
        },
      });
      return false;
    }
  }, [buildDiagnostics, language, nativeSupported, resolvedLanguage, setStatusSafe]);

  const start = useCallback(async () => {
    logVoiceDiagnostics({
      level: 'info',
      message: 'voice capture start requested',
      meta: {
        webSupported,
        nativeSupported,
        language,
        resolvedLanguage,
      },
    });
    if (!supported) {
      setError('Voice input is not supported in this environment.');
      setStatusSafe('unavailable');
      return;
    }
    setRescoreMessage('');
    stopWebAudioCapture();
    await clearAudio();
    const nativeStarted = await startNativeSpeech();
    if (nativeStarted) {
      return;
    }
    startWebSpeech();
  }, [
    clearAudio,
    language,
    nativeSupported,
    resolvedLanguage,
    setStatusSafe,
    startNativeSpeech,
    startWebSpeech,
    stopWebAudioCapture,
    supported,
    webSupported,
  ]);

  const stop = useCallback(() => {
    logVoiceDiagnostics({
      level: 'info',
      message: 'voice capture stop requested',
      meta: {
        status: statusRef.current,
        nativeActive: nativeActiveRef.current,
        captureId: nativeCaptureIdRef.current || null,
      },
    });
    if (nativeActiveRef.current && nativeCaptureIdRef.current) {
      setStatusSafe('stopping');
      stopVoiceCapture?.({
        captureId: nativeCaptureIdRef.current,
        source: 'user-stop',
      });
      return;
    }
    stopWebSpeech();
  }, [setStatusSafe, stopWebSpeech]);

  const reset = useCallback(() => {
    logVoiceDiagnostics({
      level: 'info',
      message: 'voice capture reset',
      meta: {
        status: statusRef.current,
        nativeActive: nativeActiveRef.current,
        captureId: nativeCaptureIdRef.current || null,
      },
    });
    if (nativeActiveRef.current && nativeCaptureIdRef.current) {
      stopVoiceCapture?.({
        captureId: nativeCaptureIdRef.current,
        source: 'reset',
      });
    }
    nativeActiveRef.current = false;
    nativeCaptureIdRef.current = '';
    lastInterimRef.current = '';
    lastFinalRef.current = '';
    setInterimText('');
    setError('');
    lastErrorRef.current = '';
    setRescoreMessage('');
    stopWebAudioCapture();
    clearAudio();
    if (statusRef.current !== 'unavailable') {
      setStatusSafe('idle');
    }
  }, [clearAudio, setStatusSafe, stopWebAudioCapture]);

  useEffect(() => {
    return () => {
      logVoiceDiagnostics({
        level: 'info',
        message: 'voice capture cleanup',
        meta: {
          status: statusRef.current,
          nativeActive: nativeActiveRef.current,
          captureId: nativeCaptureIdRef.current || null,
        },
      });
      if (nativeActiveRef.current && nativeCaptureIdRef.current) {
        stopVoiceCapture?.({
          captureId: nativeCaptureIdRef.current,
          source: 'cleanup',
        });
      }
      stopWebAudioCapture();
      clearAudio();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort?.();
        } catch (error) {
          // Ignore teardown errors.
        }
      }
      recognitionRef.current = null;
    };
  }, [clearAudio, stopWebAudioCapture]);

  const isRecording = status === 'recording' || status === 'starting';
  const statusMessage = useMemo(() => {
    if (rescoreMessage) {
      return `Rescoring (${rescoreMessage})...`;
    }
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
  }, [error, rescoreMessage, status]);

  return {
    supported,
    status,
    isRecording,
    language,
    languageOptions,
    resolvedLanguage,
    setLanguage,
    interimText,
    audio,
    clearAudio,
    error,
    statusMessage,
    start,
    stop,
    reset,
  };
}
