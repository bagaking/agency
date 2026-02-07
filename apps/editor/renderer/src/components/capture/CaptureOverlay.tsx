import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaptureCanvas } from './CaptureCanvas';
import { CaptureToolbar } from './CaptureToolbar';

const getCaptureParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    requestId: params.get('requestId') || '',
    displayId: params.get('displayId') || '',
  };
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
    if (!window.agencyCapture?.getDisplaySource) {
      setError('Capture API unavailable.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const source = await window.agencyCapture.getDisplaySource({
        requestId,
        displayId,
      });
      if (!source?.dataUrl) {
        throw new Error('No capture source available.');
      }
      setImageSrc(source.dataUrl);
    } catch (err) {
      setError(err?.message || 'Failed to load capture source.');
    } finally {
      setLoading(false);
    }
  }, [displayId, requestId]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  const handleCancel = useCallback(() => {
    window.agencyCapture?.cancelCapture({ requestId, reason: 'Canceled by user.' });
  }, [requestId]);

  const handleConfirm = useCallback(async () => {
    if (!window.agencyCapture?.completeCapture) {
      setError('Capture API unavailable.');
      return;
    }
    const result = canvasRef.current?.exportSelection?.();
    if (!result?.dataUrl) {
      setError('Select a region before capturing.');
      return;
    }
    await window.agencyCapture.completeCapture({
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
    await window.agencyCapture?.setIncludeAgencyWindows?.({
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
        <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-sm">
          {error}
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
