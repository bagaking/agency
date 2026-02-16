import { materializeClipboard, writeTerminal } from '../services/agencyBridge';

const MODIFIER_ALIASES = {
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
};

const KEY_ALIASES = {
  esc: 'Escape',
  escape: 'Escape',
  return: 'Enter',
  enter: 'Enter',
  tab: 'Tab',
  backspace: 'Backspace',
  del: 'Delete',
  delete: 'Delete',
  up: 'ArrowUp',
  arrowup: 'ArrowUp',
  down: 'ArrowDown',
  arrowdown: 'ArrowDown',
  left: 'ArrowLeft',
  arrowleft: 'ArrowLeft',
  right: 'ArrowRight',
  arrowright: 'ArrowRight',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  home: 'Home',
  end: 'End',
  space: 'Space',
  spacebar: 'Space',
};

const KEY_SEQUENCES = {
  Enter: '\r',
  Tab: '\t',
  Escape: '\x1b',
  Backspace: '\x7f',
  Delete: '\x1b[3~',
  ArrowUp: '\x1b[A',
  ArrowDown: '\x1b[B',
  ArrowRight: '\x1b[C',
  ArrowLeft: '\x1b[D',
  Home: '\x1b[H',
  End: '\x1b[F',
  PageUp: '\x1b[5~',
  PageDown: '\x1b[6~',
  Space: ' ',
};

const SAFE_PATH_PATTERN = /^[A-Za-z0-9_\-./]+$/;

const normalizeKeyName = (value) => {
  if (value === ' ') {
    return 'Space';
  }
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  const lower = trimmed.toLowerCase();
  if (KEY_ALIASES[lower]) {
    return KEY_ALIASES[lower];
  }
  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }
  return trimmed;
};

const buildShortcutString = (modifiers, keyName) => {
  const parts = [];
  if (modifiers.ctrl) {
    parts.push('Ctrl');
  }
  if (modifiers.alt) {
    parts.push('Alt');
  }
  if (modifiers.shift) {
    parts.push('Shift');
  }
  if (modifiers.meta) {
    parts.push('Meta');
  }
  if (keyName) {
    parts.push(keyName);
  }
  return parts.join('+');
};

const parseModifiers = (parts) => {
  const modifiers = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };
  let key = '';
  parts.forEach((part) => {
    const lower = part.toLowerCase();
    const modifier = MODIFIER_ALIASES[lower];
    if (modifier) {
      modifiers[modifier] = true;
      return;
    }
    key = part;
  });
  return { modifiers, key };
};

export const normalizeShortcutKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const parts = raw.split('+').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return '';
  }
  const { modifiers, key } = parseModifiers(parts);
  const normalizedKey = normalizeKeyName(key);
  if (!normalizedKey) {
    return '';
  }
  return buildShortcutString(modifiers, normalizedKey);
};

export const buildShortcutIndex = (bindings = []) => {
  const index = new Map();
  (bindings || []).forEach((binding) => {
    if (!binding) {
      return;
    }
    const normalizedKey = normalizeShortcutKey(binding.key || '');
    if (!normalizedKey) {
      return;
    }
    index.set(normalizedKey, binding);
  });
  return index;
};

const normalizeEventShortcut = (event) => {
  if (!event) {
    return '';
  }
  if (event.isComposing || event.key === 'Process' || event.key === 'Dead') {
    return '';
  }
  if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') {
    return '';
  }
  const keyName = normalizeKeyName(event.key);
  if (!keyName) {
    return '';
  }
  return buildShortcutString(
    {
      ctrl: Boolean(event.ctrlKey),
      alt: Boolean(event.altKey),
      shift: Boolean(event.shiftKey),
      meta: Boolean(event.metaKey),
    },
    keyName
  );
};

export const matchShortcutBinding = (event, index) => {
  if (!index || index.size === 0) {
    return null;
  }
  const normalized = normalizeEventShortcut(event);
  if (!normalized) {
    return null;
  }
  return index.get(normalized) || null;
};

const normalizeTerminalText = (text) =>
  String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\r');

const ctrlSequenceFor = (keyChar) => {
  const value = String(keyChar || '');
  if (!value) {
    return '';
  }
  const upper = value.toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(code - 64);
  }
  return '';
};

const parseKeySpec = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, key: '' };
  }
  const parts = raw.split('+').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return { modifiers: { ctrl: false, alt: false, shift: false, meta: false }, key: '' };
  }
  const { modifiers, key } = parseModifiers(parts);
  return { modifiers, key: key || parts[parts.length - 1] };
};

const resolveKeySequence = (keySpec) => {
  const { modifiers, key } = parseKeySpec(keySpec);
  if (!key) {
    return '';
  }
  const normalizedKey = normalizeKeyName(key);
  if (modifiers.ctrl) {
    const ctrlSequence = ctrlSequenceFor(key);
    if (ctrlSequence) {
      return ctrlSequence;
    }
  }
  if (modifiers.alt || modifiers.meta) {
    if (key.length === 1) {
      return `\x1b${key}`;
    }
    if (KEY_SEQUENCES[normalizedKey]) {
      return `\x1b${KEY_SEQUENCES[normalizedKey]}`;
    }
  }
  if (KEY_SEQUENCES[normalizedKey]) {
    return KEY_SEQUENCES[normalizedKey];
  }
  if (key.length === 1) {
    return key;
  }
  return '';
};

const formatShellPath = (value) => {
  if (!value) {
    return '';
  }
  if (SAFE_PATH_PATTERN.test(value)) {
    return value;
  }
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
};

export const dispatchTerminalAction = async ({
  action,
  cellId,
  sessionId,
  worktreePath,
  onActivity,
  logRuntime,
  pasteTracker,
  pasteThrottleMs = 120,
}) => {
  if (!action || !cellId || !sessionId) {
    return false;
  }
  const sendData = (data) => {
    if (!data) {
      return false;
    }
    const sent = writeTerminal({ cellId, sessionId, data });
    if (sent == null) {
      return false;
    }
    if (onActivity) {
      onActivity({ cellId, sessionId });
    }
    return true;
  };
  const actionType = action.type || 'sendText';
  if (actionType === 'sendKeys') {
    const keys = Array.isArray(action.keys) ? action.keys : [];
    const payload = keys.map(resolveKeySequence).filter(Boolean).join('');
    return sendData(payload);
  }
  if (actionType === 'pasteFiles') {
    if (!worktreePath) {
      logRuntime?.({
        level: 'warn',
        message: 'terminal paste unavailable',
        meta: { cellId, sessionId },
      });
      return false;
    }
    const now = Date.now();
    if (pasteTracker && now - (pasteTracker.current || 0) < pasteThrottleMs) {
      return false;
    }
    if (pasteTracker) {
      pasteTracker.current = now;
    }
    try {
      const result = await materializeClipboard({
        rootPath: worktreePath,
        targetDir: '.agency/tmp',
        includeText: true,
        relativeTo: worktreePath,
      });
      if (result?.type === 'files' || result?.type === 'image') {
        const paths = (result.paths || []).filter(Boolean).map(formatShellPath);
        if (paths.length) {
          return sendData(paths.join(' '));
        }
        return false;
      }
      if (result?.type === 'text' && result.text) {
        return sendData(normalizeTerminalText(result.text));
      }
    } catch (error) {
      logRuntime?.({
        level: 'error',
        message: 'terminal paste failed',
        meta: {
          cellId,
          sessionId,
          error: error?.message || String(error),
        },
      });
    }
    return false;
  }
  if (actionType === 'sendText') {
    return sendData(normalizeTerminalText(action.text || ''));
  }
  return false;
};
