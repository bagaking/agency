type DockLike = {
  show?: () => void;
};

type AppLike = {
  show?: () => void;
  dock?: DockLike | null;
};

type WindowLike = {
  isDestroyed?: () => boolean;
  isMinimized?: () => boolean;
  restore?: () => void;
  show?: () => void;
  focus?: () => void;
};

function isDestroyed(windowLike: WindowLike | null | undefined): boolean {
  if (!windowLike) {
    return true;
  }
  return Boolean(windowLike.isDestroyed?.());
}

export function showAgencyWindows(windows: WindowLike[] = []): void {
  windows.forEach((windowLike) => {
    if (isDestroyed(windowLike)) {
      return;
    }
    windowLike.show?.();
  });
}

export function restoreAgencyAppVisibility(
  appLike: AppLike | null | undefined,
  options: { platform?: string } = {}
): void {
  const platform = String(options.platform || process.platform || '').trim().toLowerCase();
  if (platform !== 'darwin' || !appLike) {
    return;
  }
  try {
    appLike.dock?.show?.();
  } catch {
    // Best-effort only.
  }
  try {
    appLike.show?.();
  } catch {
    // Best-effort only.
  }
}

export function focusAgencyWindow(windowLike: WindowLike | null | undefined): void {
  if (isDestroyed(windowLike)) {
    return;
  }
  if (windowLike?.isMinimized?.()) {
    windowLike.restore?.();
  }
  windowLike?.show?.();
  windowLike?.focus?.();
}
