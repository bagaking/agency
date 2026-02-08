import { performFileIntent as invokeFileIntent } from './agencyBridge';

export type FileIntentPayload = {
  intent: string;
  sourceSurface?: string;
  callerType?: string;
  callerId?: string;
  traceId?: string;
  [key: string]: any;
};

export const runFileIntent = async (payload: FileIntentPayload) => {
  const response = await invokeFileIntent(payload);
  if (!response) {
    throw new Error('File interaction gateway is unavailable.');
  }
  if (response.success === false) {
    const message =
      response?.failures?.[0]?.message ||
      `File intent failed: ${payload?.intent || 'unknown'}.`;
    throw new Error(message);
  }
  return response;
};

