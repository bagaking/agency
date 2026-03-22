import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaptureCanvas } from './CaptureCanvas';
import { CaptureToolbar } from './CaptureToolbar';
import {
  cancelCapture,
  completeCapture,
  getCaptureDisplaySource,
  isCaptureBridgeAvailable,
  setCaptureIncludeAgencyWindows,
} from '../../services/captureOverlayBridge';

const getCaptureParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    requestId: params.get('requestId') || '',
    displayId: params.get('displayId') || '',
  };
};

const formatCaptureLoadError = (err) => {
  const message = String(err?.message || '').trim();
  if (!message) {
    return 'Failed to load capture source.';
  }
  if (message.includes('Failed to get sources')) {
    return `${message} Check Screen Recording permission and retry.`;
  }
  if (
    message.includes('Screen Recording permission') ||
    message.includes('Screen recording permission')
  ) {
    return `${message}`;
  }
  return message;
};

export function CaptureOverlay() {
  const { requestId, displayId } = useMemo(getCaptureParams, []);
  const canvasRef = useRef(null);
  const [imageSrc, setImageSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tool, setTool] = useState('select');
  const [selection, setSelection] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [includeAgencyWindows, setIncludeAgencyWindows] = useState(false);

  const loadSource = useCallback(async () => {
    if (!isCaptureBridgeAvailable()) {
      setError('Capture API unavailable.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const source = await getCaptureDisplaySource({
        requestId,
        displayId,
      });
      if (!source?.dataUrl) {
        throw new Error('No capture source available.');
      }
      setImageSrc(source.dataUrl);
    } catch (err) {
      setError(formatCaptureLoadError(err));
    } finally {
      setLoading(false);
    }
  }, [displayId, requestId]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  const handleCancel = useCallback(() => {
    void cancelCapture({ requestId, reason: 'Canceled by user.' });
  }, [requestId]);

  const handleConfirm = useCallback(async () => {
    if (!isCaptureBridgeAvailable()) {
      setError('Capture API unavailable.');
      return;
    }
    const result = canvasRef.current?.exportSelection?.();
    if (!result?.dataUrl) {
      setError('Select a region before capturing.');
      return;
    }
    await completeCapture({
      requestId,
      payload: {
        displayId,
        ...result,
      },
    });
  }, [displayId, requestId]);

  const handleUndo = useCallback(() => {
    setAnnotations((current) => current.slice(0, -1));
  }, []);

  const handleToggleInclude = useCallback(async () => {
    const next = !includeAgencyWindows;
    setIncludeAgencyWindows(next);
    await setCaptureIncludeAgencyWindows({
      requestId,
      includeAgencyWindows: next,
    });
    await loadSource();
  }, [includeAgencyWindows, loadSource, requestId]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleCancel, handleConfirm]);

  return (
    <div className="relative h-screen w-screen bg-black/60">
      <CaptureToolbar
        tool={tool}
        onToolChange={setTool}
        onUndo={handleUndo}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        canConfirm={Boolean(selection)}
        includeAgencyWindows={includeAgencyWindows}
        onToggleInclude={handleToggleInclude}
      />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
          Preparing capture...
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm">
          <div className="max-w-[640px] text-rose-300">{error}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSource}
              className="rounded border border-white/20 px-3 py-1 text-white/80 transition-colors hover:bg-white/10"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-white/20 px-3 py-1 text-white/80 transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <CaptureCanvas
          ref={canvasRef}
          imageSrc={imageSrc}
          tool={tool}
          selection={selection}
          annotations={annotations}
          onSelectionChange={setSelection}
          onAnnotationsChange={setAnnotations}
        />
      )}
    </div>
  );
}
