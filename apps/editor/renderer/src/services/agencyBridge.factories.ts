import { invokeAgencyMethod } from './agencyBridge.core';

export const createOptionalInvoke = (
  methodName: string,
  { fallback = null }: { fallback?: any } = {}
) => {
  return async (payload?: any) => invokeAgencyMethod(methodName, payload, fallback);
};

export const createOptionalAction = (
  methodName: string,
  { fallback = null }: { fallback?: any } = {}
) => {
  return (payload?: any) => invokeAgencyMethod(methodName, payload, fallback);
};

export const createOptionalSubscribe = (methodName: string) => {
  return (handler: any) => invokeAgencyMethod(methodName, handler, null);
};
