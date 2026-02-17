const normalizeInput = (value: unknown): string => String(value ?? '');

/**
 * Normalize `\r\n` and `\r` line endings into `\n`.
 *
 * Note: This is intentionally lossy for standalone `\r` (carriage return),
 * matching how several UI preview surfaces treat cached terminal text.
 */
export const normalizeLineEndingsToLf = (value: unknown): string =>
  normalizeInput(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

/**
 * Normalize newline boundaries into CRLF (`\r\n`) for xterm write calls.
 *
 * Keeps standalone `\r` untouched (carriage return semantics).
 */
export const normalizeLineEndingsToCrlf = (value: unknown): string =>
  normalizeInput(value).replace(/\r?\n/g, '\r\n');

export const __testLineEndings = {
  normalizeInput,
};

