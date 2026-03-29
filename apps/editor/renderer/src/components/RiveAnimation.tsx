import { lazy, Suspense, type ReactNode } from 'react';

const LazyRiveAnimationRuntime = lazy(async () => {
  const mod = await import('./RiveAnimationRuntime');
  return {
    default: mod.default,
  };
});

export function RiveAnimation({
  src,
  artboard,
  animations,
  stateMachines,
  className,
  fit,
  alignment,
  fallback,
}: {
  src?: string;
  artboard?: string;
  animations?: string | string[];
  stateMachines?: string | string[];
  className?: string;
  fit?: unknown;
  alignment?: unknown;
  fallback?: ReactNode;
}) {
  if (!src) {
    return fallback || null;
  }

  return (
    <Suspense fallback={fallback || null}>
      <LazyRiveAnimationRuntime
        src={src}
        artboard={artboard}
        animations={animations}
        stateMachines={stateMachines}
        className={className}
        fit={fit}
        alignment={alignment}
        fallback={fallback}
      />
    </Suspense>
  );
}
