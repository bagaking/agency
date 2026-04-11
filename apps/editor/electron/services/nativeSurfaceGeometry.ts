import type { Rectangle } from 'electron';

type ViewLike = {
  getBounds?: () => Rectangle;
  webContents?: {
    id?: number;
  };
  children?: Iterable<ViewLike> | ArrayLike<ViewLike>;
};

type BrowserWindowLike = {
  webContents?: {
    id?: number;
    getZoomFactor?: () => number;
  };
  getContentView?: () => ViewLike | null | undefined;
  getContentBounds?: () => Rectangle | null | undefined;
  contentView?: ViewLike | null | undefined;
  getRendererViewBounds?: () => Rectangle | null | undefined;
};

function listChildViews(parentView: ViewLike | null | undefined): ViewLike[] {
  const rawChildren = parentView?.children;
  if (!rawChildren) {
    return [];
  }
  if (Array.isArray(rawChildren)) {
    return rawChildren;
  }
  if (typeof (rawChildren as any)[Symbol.iterator] === 'function') {
    return Array.from(rawChildren as Iterable<ViewLike>);
  }
  const length = Number((rawChildren as ArrayLike<ViewLike>).length || 0);
  if (!Number.isFinite(length) || length < 1) {
    return [];
  }
  return Array.from({ length }, (_, index) => (rawChildren as ArrayLike<ViewLike>)[index]).filter(Boolean);
}

export function clampRectangleToParent(
  rect: Rectangle | null | undefined,
  parentBounds: Rectangle | null | undefined
): Rectangle | null {
  if (!rect || !parentBounds) {
    return rect || null;
  }

  const minX = Number(parentBounds.x || 0);
  const minY = Number(parentBounds.y || 0);
  const maxX = minX + Math.max(0, Number(parentBounds.width || 0));
  const maxY = minY + Math.max(0, Number(parentBounds.height || 0));
  const nextX = Math.max(minX, Math.min(maxX, Number(rect.x || 0)));
  const nextY = Math.max(minY, Math.min(maxY, Number(rect.y || 0)));
  const nextWidth = Math.max(0, Math.min(Number(rect.width || 0), maxX - nextX));
  const nextHeight = Math.max(0, Math.min(Number(rect.height || 0), maxY - nextY));

  if (!nextWidth || !nextHeight) {
    return null;
  }

  return {
    x: Math.floor(nextX),
    y: Math.floor(nextY),
    width: Math.floor(nextWidth),
    height: Math.floor(nextHeight),
  };
}

export function resolveOwnerRendererViewBounds(ownerWindow: BrowserWindowLike | null | undefined): Rectangle | null {
  const explicitBounds = ownerWindow?.getRendererViewBounds?.();
  if (explicitBounds) {
    return explicitBounds;
  }
  const ownerWebContentsId = Number(ownerWindow?.webContents?.id || 0);
  if (!ownerWebContentsId) {
    return null;
  }

  const contentView = ownerWindow?.getContentView?.() ?? ownerWindow?.contentView;
  const candidate = listChildViews(contentView).find(
    (childView) => Number(childView?.webContents?.id || 0) === ownerWebContentsId
  );
  if (!candidate?.getBounds) {
    const contentBounds = ownerWindow?.getContentBounds?.();
    const width = Math.max(0, Math.floor(Number(contentBounds?.width || 0)));
    const height = Math.max(0, Math.floor(Number(contentBounds?.height || 0)));
    if (!width || !height) {
      return null;
    }
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }
  return candidate.getBounds() || null;
}

export function resolveOwnerRendererZoomFactor(
  ownerWindow: BrowserWindowLike | null | undefined
): number {
  const zoomFactor = Number(ownerWindow?.webContents?.getZoomFactor?.() ?? 1);
  if (!Number.isFinite(zoomFactor) || zoomFactor <= 0) {
    return 1;
  }
  return zoomFactor;
}

export function mapRendererRectToNativeContentRect(
  ownerWindow: BrowserWindowLike | null | undefined,
  rendererRect: Rectangle | null | undefined
): Rectangle | null {
  if (!rendererRect) {
    return null;
  }

  const rendererViewBounds = resolveOwnerRendererViewBounds(ownerWindow);
  if (!rendererViewBounds) {
    return null;
  }
  const rendererZoomFactor = resolveOwnerRendererZoomFactor(ownerWindow);

  const mappedRect = {
    x: Math.floor(
      Number(rendererViewBounds.x || 0) + Number(rendererRect.x || 0) * rendererZoomFactor
    ),
    y: Math.floor(
      Number(rendererViewBounds.y || 0) + Number(rendererRect.y || 0) * rendererZoomFactor
    ),
    width: Math.floor(Number(rendererRect.width || 0) * rendererZoomFactor),
    height: Math.floor(Number(rendererRect.height || 0) * rendererZoomFactor),
  };

  return clampRectangleToParent(mappedRect, rendererViewBounds);
}
