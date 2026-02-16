type AgencyApi = Record<string, unknown>;

const getAgencyApi = (): AgencyApi | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return ((window as any).agency as AgencyApi | undefined) ?? null;
};

export const isAgencyAvailable = (): boolean => Boolean(getAgencyApi());

export const isAgencyMethodAvailable = (methodName: string): boolean => {
  const api = getAgencyApi();
  if (!api) {
    return false;
  }
  return typeof (api as any)[methodName] === 'function';
};

export const invokeAgencyMethod = <TResult = any>(
  methodName: string,
  payload: any,
  fallback: TResult | null = null
): TResult | null => {
  const api = getAgencyApi();
  const fn = api ? (api as any)[methodName] : undefined;
  if (typeof fn !== 'function') {
    return fallback;
  }

  // Preserve legacy behavior: methods without a payload were invoked with 0 args.
  if (payload === undefined) {
    return fn();
  }

  return fn(payload);
};
