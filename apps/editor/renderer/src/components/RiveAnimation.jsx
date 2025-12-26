import React, { useEffect, useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export function RiveAnimation({ 
  src, 
  artboard, 
  animations, 
  stateMachines, 
  className, 
  fit = Fit.Contain, 
  alignment = Alignment.Center,
  fallback
}) {
  const [error, setError] = useState(false);

  const { RiveComponent, rive } = useRive({
    src,
    artboard,
    animations,
    stateMachines,
    layout: new Layout({
      fit,
      alignment,
    }),
    autoplay: true,
    onError: () => setError(true),
  });

  // Reset error if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return fallback || <div className={`bg-muted/20 ${className}`} />;
  }

  // If we can't load (e.g. valid src but network error), useRive doesn't always throw immediately,
  // but if src is missing/empty, we handle it.
  if (!src) {
      return fallback || null;
  }

  return <RiveComponent className={className} />;
}
