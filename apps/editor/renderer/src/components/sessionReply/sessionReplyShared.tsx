import React from 'react';

import { formatTerminalSelectionTime, normalizeTerminalSelectionText } from '../../utils/terminalSelection';

export const DEFAULT_TIME_TAG = 'Nature';
export const REPLY_EDITOR_HEIGHT = 112;
export const REPLY_EDITOR_PADDING = 12;
export const REPLY_EDITOR_FONT_SIZE = 13;
export const REPLY_EDITOR_LINE_HEIGHT = 20;
export const REPLY_EDITOR_FONT_FAMILY =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';

export const SCOPE_LABELS: Record<string, string> = {
  global: 'Global',
  project: 'Project',
  agent: 'Agent',
};

export const normalizeReplyTerminalPayload = (value: unknown) =>
  normalizeTerminalSelectionText(value);

export const formatReplyTimeTag = (timestamp: unknown) =>
  formatTerminalSelectionTime(timestamp) || DEFAULT_TIME_TAG;

export const buildReplyPayload = ({
  site,
  timeTag,
  query,
}: {
  site?: string;
  timeTag?: string;
  query: string;
}) => {
  if (!site) {
    return query;
  }
  return [
    `<reply time="${timeTag || DEFAULT_TIME_TAG}">`,
    `<site>${site}</site>`,
    `<query>${query}</query>`,
    '</reply>',
  ].join('\n');
};

export const renderReplySiteSegments = (site: unknown) => {
  const parts = String(site || '').split('`');
  return parts.map((part, index) => {
    if (!part) {
      return null;
    }
    if (index % 2 === 1) {
      return (
        <mark key={`site-${index}`} className="rounded bg-primary/15 px-1 py-0.5 text-primary">
          {part}
        </mark>
      );
    }
    return <span key={`site-${index}`}>{part}</span>;
  });
};

