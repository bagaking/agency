const IPV4_PATTERN = /^(\d{1,3}\.){3}\d+$/;

export const isIpv4Literal = (value: string) => IPV4_PATTERN.test(value);

export const isPrivateIpv4 = (value: string) => {
  const parts = value.split('.').map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) {
    return true;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 0) return true;
  return false;
};

export const normalizeSupportedPublicUrl = (value: unknown) => {
  const rawInput = String(value || '').trim();
  if (!rawInput) {
    return '';
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawInput)
    ? rawInput
    : `https://${rawInput}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (_error) {
    return '';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }

  const hostname = String(parsed.hostname || '').trim().toLowerCase();
  if (!hostname) {
    return '';
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return '';
  }
  if (hostname.includes(':')) {
    return '';
  }
  if (isIpv4Literal(hostname) && isPrivateIpv4(hostname)) {
    return '';
  }
  if (!hostname.includes('.') && !isIpv4Literal(hostname)) {
    return '';
  }

  return parsed.toString();
};

export const isSupportedPublicUrl = (value: unknown) => Boolean(normalizeSupportedPublicUrl(value));
