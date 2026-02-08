import {
  classifyAgentFiles as invokeClassifyAgentFiles,
  performFileIntent as invokeFileIntent,
  performToolFileIntent as invokeToolFileIntent,
} from './agencyBridge';

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

export const runToolFileIntent = async (payload: FileIntentPayload) => {
  const response = await invokeToolFileIntent(payload);
  if (!response) {
    throw new Error('Tool file interaction gateway is unavailable.');
  }
  if (response.success === false) {
    const message =
      response?.failures?.[0]?.message ||
      `Tool file intent failed: ${payload?.intent || 'unknown'}.`;
    throw new Error(message);
  }
  return response;
};

export const classifyFiles = async (payload: { rootPath?: string; paths?: string[] } = {}) => {
  const response = await invokeClassifyAgentFiles(payload);
  if (!response) {
    throw new Error('File semantic classifier is unavailable.');
  }
  if (response.success === false) {
    const message = response?.failures?.[0]?.message || 'File semantic classification failed.';
    throw new Error(message);
  }
  return response;
};
