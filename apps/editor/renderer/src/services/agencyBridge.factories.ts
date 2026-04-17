import { invokeAgencyMethod } from './agencyBridge.core';

type OptionalBridgeOptions = {
  fallback?: any;
  recoverOnSyntaxError?: boolean;
};

const isRecoverableSyntaxError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) {
    return true;
  }
  const message = String((error as any)?.message || error || '');
  const recoverableMessages = [
    'SyntaxError',
    'Unexpected token',
    'Unexpected end of JSON input',
  ];
  return recoverableMessages.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

const recoverOptionalBridgeError = (
  methodName: string,
  error: unknown,
  { fallback = null, recoverOnSyntaxError = false }: OptionalBridgeOptions
) => {
  if (recoverOnSyntaxError && isRecoverableSyntaxError(error)) {
    console.warn(`[agencyBridge] ${methodName} recovered from malformed persisted JSON.`, error);
    return fallback;
  }
  throw error;
};

export const createOptionalInvoke = (
  methodName: string,
  options: OptionalBridgeOptions = {}
) => {
  const { fallback = null } = options;
  return async (payload?: any) => {
    try {
      return await invokeAgencyMethod(methodName, payload, fallback);
    } catch (error) {
      return recoverOptionalBridgeError(methodName, error, options);
    }
  };
};

export const createOptionalAction = (
  methodName: string,
  options: OptionalBridgeOptions = {}
) => {
  const { fallback = null } = options;
  return (payload?: any) => {
    try {
      const result = invokeAgencyMethod(methodName, payload, fallback);
      if (result && typeof (result as Promise<any>).catch === 'function') {
        return (result as Promise<any>).catch((error) =>
          recoverOptionalBridgeError(methodName, error, options)
        );
      }
      return result;
    } catch (error) {
      return recoverOptionalBridgeError(methodName, error, options);
    }
  };
};

export const createOptionalSubscribe = (methodName: string) => {
  return (handler: any) => invokeAgencyMethod(methodName, handler, null);
};
