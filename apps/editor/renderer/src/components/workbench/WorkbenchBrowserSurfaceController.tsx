import React from 'react';

import { useWorkbenchBrowserSurface } from './useWorkbenchBrowserSurface';

type WorkbenchBrowserSurfaceControllerProps = {
  tabId: string;
  url: string;
  visible: boolean;
  navigationKey: number;
  disposeOnUnmount?: boolean;
  children: (browserSurface: ReturnType<typeof useWorkbenchBrowserSurface>) => React.ReactNode;
};

export function WorkbenchBrowserSurfaceController({
  tabId,
  url,
  visible,
  navigationKey,
  disposeOnUnmount = false,
  children,
}: WorkbenchBrowserSurfaceControllerProps) {
  const browserSurface = useWorkbenchBrowserSurface({
    tabId,
    url,
    visible,
    navigationKey,
    disposeOnUnmount,
  });

  return <>{children(browserSurface)}</>;
}
