type CaptureSourcePayload = {
  requestId: string;
  displayId: string;
};

type CaptureCompletePayload = {
  requestId: string;
  payload: Record<string, unknown>;
};

type CaptureCancelPayload = {
  requestId: string;
  reason: string;
};

type CaptureIncludePayload = {
  requestId: string;
  includeAgencyWindows: boolean;
};

type CaptureSourceResult = {
  dataUrl?: string;
};

type AgencyCaptureApi = {
  getDisplaySource?: (payload: CaptureSourcePayload) => Promise<CaptureSourceResult>;
  completeCapture?: (payload: CaptureCompletePayload) => Promise<void>;
  cancelCapture?: (payload: CaptureCancelPayload) => Promise<void> | void;
  setIncludeAgencyWindows?: (payload: CaptureIncludePayload) => Promise<void>;
};

function getCaptureApi(): AgencyCaptureApi | null {
  return window.agencyCapture || null;
}

export function isCaptureBridgeAvailable(): boolean {
  const api = getCaptureApi();
  return Boolean(api?.getDisplaySource && api?.completeCapture && api?.cancelCapture);
}

export async function getCaptureDisplaySource(
  payload: CaptureSourcePayload
): Promise<CaptureSourceResult> {
  const api = getCaptureApi();
  if (!api?.getDisplaySource) {
    throw new Error('Capture API unavailable.');
  }
  return api.getDisplaySource(payload);
}

export async function completeCapture(payload: CaptureCompletePayload): Promise<void> {
  const api = getCaptureApi();
  if (!api?.completeCapture) {
    throw new Error('Capture API unavailable.');
  }
  await api.completeCapture(payload);
}

export async function cancelCapture(payload: CaptureCancelPayload): Promise<void> {
  const api = getCaptureApi();
  if (!api?.cancelCapture) {
    throw new Error('Capture API unavailable.');
  }
  await api.cancelCapture(payload);
}

export async function setCaptureIncludeAgencyWindows(
  payload: CaptureIncludePayload
): Promise<void> {
  const api = getCaptureApi();
  if (!api?.setIncludeAgencyWindows) {
    throw new Error('Capture API unavailable.');
  }
  await api.setIncludeAgencyWindows(payload);
}
