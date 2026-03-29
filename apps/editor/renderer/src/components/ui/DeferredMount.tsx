import { useEffect, useState, type ReactNode } from 'react';

type DeferredMountStrategy = 'retain' | 'unmount';

type DeferredMountProps = {
  active: boolean;
  strategy?: DeferredMountStrategy;
  children: ReactNode;
};

export function DeferredMount({
  active,
  strategy = 'retain',
  children,
}: DeferredMountProps) {
  const [hasActivated, setHasActivated] = useState(active);

  useEffect(() => {
    if (active) {
      setHasActivated(true);
    }
  }, [active]);

  if (strategy === 'unmount') {
    return active ? <>{children}</> : null;
  }

  if (!hasActivated && !active) {
    return null;
  }

  return <>{children}</>;
}
