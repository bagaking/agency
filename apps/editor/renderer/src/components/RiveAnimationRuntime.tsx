import { useEffect, useState } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

function canRenderRiveCanvas() {
  return (
    typeof window !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  );
}

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
}: any) {
  const [error, setError] = useState(false);

  const { RiveComponent } = useRive({
    src,
    artboard,
    animations,
    stateMachines,
    layout: new Layout({
      fit: fit || Fit.Contain,
      alignment: alignment || Alignment.Center,
    }),
    autoplay: true,
    onError: () => {
      setError(true);
      if (onLoadError) {
        onLoadError();
      }
    },
  } as any);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return fallback || <div className={`bg-muted/20 ${className}`} />;
  }

  return <RiveComponent className={className} />;
}

export default function RiveAnimationRuntime(props: any) {
  if (!canRenderRiveCanvas()) {
    return props?.fallback || <div className={`bg-muted/20 ${props?.className || ''}`} />;
  }
  return <RivePlayer {...props} />;
}
