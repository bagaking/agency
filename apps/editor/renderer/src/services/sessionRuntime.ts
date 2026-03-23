import { performSessionRuntimeIntent as invokeSessionRuntimeIntent } from './agencyBridge';

export type SessionRuntimeIntentPayload = {
  intent: string;
  sourceSurface?: string;
  callerType?: string;
  callerId?: string;
  traceId?: string;
  [key: string]: any;
};

export const runSessionRuntimeIntent = async (payload: SessionRuntimeIntentPayload) => {
  const response = await invokeSessionRuntimeIntent(payload);
  if (!response) {
    throw new Error('Session runtime gateway is unavailable.');
  }
  if (response.success === false) {
    const message =
      response?.failures?.[0]?.message ||
      `Session runtime intent failed: ${payload?.intent || 'unknown'}.`;
    throw new Error(message);
  }
  return response;
};
