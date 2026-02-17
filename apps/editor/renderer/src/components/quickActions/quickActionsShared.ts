import { Clipboard, Keyboard, Type } from 'lucide-react';
import { focusRing } from '../ui/focusRing';

export const scopeLabels: Record<string, string> = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

export const formatScope = (value: string): string => scopeLabels[value] || value;

export const badgeClass = (variant: string): string => {
  if (variant === 'warning') {
    return 'border-amber-500/20 bg-amber-500/5 text-amber-200/70';
  }
  if (variant === 'primary') {
    return 'border-primary/30 bg-primary/5 text-primary';
  }
  return 'border-border/50 bg-muted/20 text-muted-foreground/60';
};

export const ACTION_TYPE_OPTIONS = [
  {
    value: 'sendText',
    label: 'Send Text',
    description: 'Insert text into the terminal.',
    icon: Type,
  },
  {
    value: 'sendKeys',
    label: 'Send Keys',
    description: 'Send a key sequence (Enter, Escape).',
    icon: Keyboard,
  },
  {
    value: 'pasteFiles',
    label: 'Paste Files',
    description: 'Paste clipboard file paths.',
    icon: Clipboard,
  },
];

const KEY_LABELS: Record<string, string> = {
  ' ': 'Space',
  Escape: 'Escape',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Home: 'Home',
  End: 'End',
};

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

export const truncateText = (value: unknown, max = 48): string => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
};

const formatKeyName = (key: string): string => {
  if (!key) {
    return '';
  }
  if (KEY_LABELS[key]) {
    return KEY_LABELS[key];
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
};

export const formatShortcutFromEvent = (event: any): string => {
  if (!event || event.isComposing || MODIFIER_KEYS.has(event.key)) {
    return '';
  }
  const keyName = formatKeyName(event.key);
  if (!keyName) {
    return '';
  }
  const parts = [];
  if (event.metaKey) {
    parts.push('Cmd');
  }
  if (event.ctrlKey) {
    parts.push('Ctrl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }
  parts.push(keyName);
  return parts.join('+');
};

export const summarizeCommand = (value: unknown): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  return truncateText(trimmed.split('\n')[0], 56);
};

export const buildActionSummary = (action: any): string => {
  const actionType = action?.type || 'sendText';
  if (actionType === 'sendKeys') {
    const keys = Array.isArray(action?.keys) ? action.keys.filter(Boolean).join(', ') : '';
    return keys ? `Send Keys - ${truncateText(keys, 36)}` : 'Send Keys';
  }
  if (actionType === 'pasteFiles') {
    return 'Paste Files - clipboard';
  }
  const text = action?.text ? truncateText(action.text, 36) : '';
  return text ? `Send Text - ${text}` : 'Send Text';
};

export const focusRingClass = focusRing.strong;

export const getBindingsForProfile = (bindingsByProfile: any, profileId: string): any[] => {
  if (!bindingsByProfile || !profileId) {
    return [];
  }
  if (typeof bindingsByProfile.get === 'function') {
    return bindingsByProfile.get(profileId) || [];
  }
  return bindingsByProfile[profileId] || [];
};

export const buildBindingKey = (profileId: string, bindingId: string): string =>
  `${profileId}:${bindingId}`;
