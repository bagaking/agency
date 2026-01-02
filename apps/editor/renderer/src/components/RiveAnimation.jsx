import React, { useEffect, useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

function RivePlayer({
  src,
  artboard,
  animations,
  stateMachines,
  className,
  fit,
  alignment,
  fallback,
  onLoadError,
}) {
  const [error, setError] = useState(false);

  const { RiveComponent } = useRive({
    src,
    artboard,
    animations,
    stateMachines,
    layout: new Layout({
      fit,
      alignment,
    }),
    autoplay: true,
    onError: () => {
      setError(true);
      if (onLoadError) {
        onLoadError();
      }
    },
  });

  // Reset error if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return fallback || <div className={`bg-muted/20 ${className}`} />;
  }

  return <RiveComponent className={className} />;
}

export function RiveAnimation({
  src,
  artboard,
  animations,
  stateMachines,
  className,
  fit = Fit.Contain,
  alignment = Alignment.Center,
  fallback,
}) {
  if (!src) {
    return fallback || null;
  }

  return (
    <RivePlayer
      src={src}
      artboard={artboard}
      animations={animations}
      stateMachines={stateMachines}
      className={className}
      fit={fit}
      alignment={alignment}
      fallback={fallback}
    />
  );
}
