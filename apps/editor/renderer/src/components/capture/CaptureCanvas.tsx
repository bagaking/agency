import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

const normalizeRect = (start, end) => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
};

const drawArrow = (ctx, start, end) => {
  const headLength = 10;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.lineTo(end.x, end.y);
  ctx.fill();
};

const drawAnnotation = (ctx, annotation) => {
  if (!annotation) {
    return;
  }
  const { type, start, end, text } = annotation;
  if (!start || !end) {
    return;
  }
  if (type === 'highlight') {
    const rect = normalizeRect(start, end);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  if (type === 'rect') {
    const rect = normalizeRect(start, end);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  if (type === 'arrow') {
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 2;
    drawArrow(ctx, start, end);
    return;
  }
  if (type === 'text') {
    ctx.fillStyle = '#fca5a5';
    ctx.font = '16px sans-serif';
    ctx.fillText(text || '', start.x, start.y);
  }
};

export const CaptureCanvas = forwardRef(function CaptureCanvas(
  { imageSrc, tool, selection, annotations, onSelectionChange, onAnnotationsChange }: any,
  ref
) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [draftSelection, setDraftSelection] = useState(null);
  const [draftAnnotation, setDraftAnnotation] = useState(null);

  const loadImage = useCallback(async () => {
    if (!imageSrc) {
      return;
    }
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    imageRef.current = image;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = image.width;
      canvas.height = image.height;
    }
  }, [imageSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    (annotations || []).forEach((annotation) => drawAnnotation(ctx, annotation));
    if (draftAnnotation) {
      drawAnnotation(ctx, draftAnnotation);
    }
    const activeSelection = draftSelection || selection;
    if (activeSelection?.start && activeSelection?.end) {
      const rect = normalizeRect(activeSelection.start, activeSelection.end);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  }, [annotations, draftAnnotation, draftSelection, selection]);

  useEffect(() => {
    loadImage().then(draw).catch(() => undefined);
  }, [draw, loadImage]);

  useEffect(() => {
    draw();
  }, [draw, selection, annotations, draftAnnotation, draftSelection]);

  const toCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * scaleY));
    return { x, y };
  };

  const handleMouseDown = (event) => {
    if (!imageRef.current) {
      return;
    }
    const point = toCanvasPoint(event);
    if (tool === 'select') {
      setDraftSelection({ start: point, end: point });
      return;
    }
    if (!selection?.start || !selection?.end) {
      return;
    }
    setDraftAnnotation({ type: tool, start: point, end: point });
  };

  const handleMouseMove = (event) => {
    if (draftSelection) {
      setDraftSelection((current) =>
        current ? { ...current, end: toCanvasPoint(event) } : current
      );
      return;
    }
    if (draftAnnotation) {
      setDraftAnnotation((current) =>
        current ? { ...current, end: toCanvasPoint(event) } : current
      );
    }
  };

  const handleMouseUp = () => {
    if (draftSelection) {
      onSelectionChange?.(draftSelection);
      setDraftSelection(null);
      return;
    }
    if (draftAnnotation) {
      if (draftAnnotation.type === 'text') {
        const text = window.prompt('Annotation text:');
        if (text) {
          onAnnotationsChange?.([...(annotations || []), { ...draftAnnotation, text }]);
        }
      } else {
        onAnnotationsChange?.([...(annotations || []), draftAnnotation]);
      }
      setDraftAnnotation(null);
    }
  };

  useImperativeHandle(ref, () => ({
    exportSelection: () => {
      if (!selection?.start || !selection?.end || !imageRef.current) {
        return null;
      }
      const rect = normalizeRect(selection.start, selection.end);
      if (rect.width <= 1 || rect.height <= 1) {
        return null;
      }
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = imageRef.current.width;
      baseCanvas.height = imageRef.current.height;
      const baseCtx = baseCanvas.getContext('2d');
      baseCtx.drawImage(imageRef.current, 0, 0, baseCanvas.width, baseCanvas.height);
      (annotations || []).forEach((annotation) => drawAnnotation(baseCtx, annotation));
      const outCanvas = document.createElement('canvas');
      outCanvas.width = Math.round(rect.width);
      outCanvas.height = Math.round(rect.height);
      const outCtx = outCanvas.getContext('2d');
      outCtx.drawImage(
        baseCanvas,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        outCanvas.width,
        outCanvas.height
      );
      return {
        dataUrl: outCanvas.toDataURL('image/png'),
        width: outCanvas.width,
        height: outCanvas.height,
      };
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
});
