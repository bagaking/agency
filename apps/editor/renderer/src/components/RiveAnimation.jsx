import React, { useEffect, useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

const riveAssetCache = new Map();

const isRenderableRive = (response) => {
  if (!response?.ok) {
    return false;
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    return false;
  }
  if (contentType.includes('application/json')) {
    return false;
  }
  if (contentType.includes('text/plain')) {
    return false;
  }
  return true;
};

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
  const [canLoad, setCanLoad] = useState(false);

  useEffect(() => {
    let active = true;
    if (!src) {
      setCanLoad(false);
      return () => {
        active = false;
      };
    }
    if (riveAssetCache.has(src)) {
      setCanLoad(riveAssetCache.get(src));
      return () => {
        active = false;
      };
    }
    fetch(src, { method: 'HEAD' })
      .then((response) => {
        if (!active) {
          return;
        }
        const ok = isRenderableRive(response);
        riveAssetCache.set(src, ok);
        setCanLoad(ok);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        riveAssetCache.set(src, false);
        setCanLoad(false);
      });
    return () => {
      active = false;
    };
  }, [src]);

  if (!src || !canLoad) {
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
      onLoadError={() => {
        riveAssetCache.set(src, false);
        setCanLoad(false);
      }}
    />
  );
}
