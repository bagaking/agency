import React, { useMemo, useState } from 'react';
import { AlertTriangle, Maximize2, Minus, Plus, RefreshCw } from 'lucide-react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function MediaWorkbenchView({ kind, fileUrl, size, onReload }: any) {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);

  if (kind === 'binary') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
        <AlertTriangle size={16} className="mb-2" />
        Binary file preview is not available.
        <button
          type="button"
          onClick={onReload}
          className="mt-3 rounded border border-border px-3 py-1 text-xs hover:text-foreground"
        >
          <RefreshCw size={12} className="inline-block mr-1" /> Reload
        </button>
      </div>
    );
  }

  const style = useMemo(() => {
    if (kind !== 'image') {
      return undefined;
    }
    if (fit) {
      return { maxWidth: '100%', maxHeight: '100%' };
    }
    return { transform: `scale(${zoom})`, transformOrigin: 'center center' };
  }, [fit, kind, zoom]);

  const handleZoomIn = () => {
    setFit(false);
    setZoom((current) => clamp(current + 0.1, 0.5, 3));
  };
  const handleZoomOut = () => {
    setFit(false);
    setZoom((current) => clamp(current - 0.1, 0.5, 3));
  };
  const handleFit = () => {
    setFit(true);
    setZoom(1);
  };

  if (!fileUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
        <AlertTriangle size={16} className="mb-2" />
        Unable to preview this file.
        <button
          type="button"
          onClick={onReload}
          className="mt-3 rounded border border-border px-3 py-1 text-xs hover:text-foreground"
        >
          <RefreshCw size={12} className="inline-block mr-1" /> Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <div>{size ? `${Math.round(size / 1024)} KB` : 'Media'}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded border border-border px-2 py-1 hover:text-foreground"
            title="Zoom out"
          >
            <Minus size={12} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded border border-border px-2 py-1 hover:text-foreground"
            title="Zoom in"
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="rounded border border-border px-2 py-1 hover:text-foreground"
            title="Fit to view"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-background p-6">
        {kind === 'image' ? (
          <div className="flex h-full items-center justify-center">
            <img src={fileUrl} alt="" style={style} />
          </div>
        ) : null}
        {kind === 'video' ? (
          <video src={fileUrl} controls className="max-h-full w-full rounded border border-border" />
        ) : null}
        {kind === 'audio' ? (
          <audio src={fileUrl} controls className="w-full" />
        ) : null}
        {kind === 'pdf' ? (
          <iframe title="PDF preview" src={fileUrl} className="h-full w-full rounded border border-border" />
        ) : null}
      </div>
    </div>
  );
}
