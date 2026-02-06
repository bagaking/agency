import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MessageSquarePlus, RefreshCw, Send, StickyNote } from 'lucide-react';
import {
  attachTerminal,
  ensureInputListener,
  ensureStarted,
  ensureTerminalEntry,
} from '../terminal/terminalManager.js';
import {
  buildShortcutIndex,
  dispatchTerminalAction,
  matchShortcutBinding,
} from '../terminal/terminalInputDispatcher.js';
import {
  createHilItem,
  onTerminalDetached,
  setSessionInteractive,
  setSessionMouse,
} from '../services/agencyBridge.js';
import {
  getCachedSessionMapPreview,
  primeSessionMapPreview,
} from '../services/sessionMapPreviewCache.js';
import { AgentAvatarBadge } from './ui/AgentAvatarBadge.jsx';
import { resolveAvatarId } from '../utils/agentAvatar.js';
import { PREVIEW_LINES } from './sessionMap/sessionMapConstants.js';

const normalizePreviewData = (value) =>
  String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const normalizeSelectionText = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\r');

const DEFAULT_ACTIVITY_DIFF_THRESHOLD = 12;
const TRAILING_PATH_PUNCTUATION = /[.,;:!?)}\]。，；：！？）】》」』、]+$/;
const PATH_REGEX = /(^|[^A-Za-z0-9_@./~+-])([A-Za-z0-9_@./~+-]+\/[A-Za-z0-9_@./~+-]+\.[A-Za-z0-9]+(?::\d+(?::\d+)?)?)/g;

const normalizeActivitySnapshot = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trimEnd();

const resolveActivityThreshold = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ACTIVITY_DIFF_THRESHOLD;
  }
  return Math.max(1, Math.floor(parsed));
};

const countDiffChars = (prev, next, limit) => {
  if (prev === next) {
    return 0;
  }
  const left = String(prev || '');
  const right = String(next || '');
  const leftLen = left.length;
  const rightLen = right.length;
  const minLen = Math.min(leftLen, rightLen);
  let diff = Math.abs(leftLen - rightLen);
  const cap = Number.isFinite(limit) ? limit : Infinity;
  for (let i = 0; i < minLen && diff <= cap; i += 1) {
    if (left[i] !== right[i]) {
      diff += 1;
    }
  }
  return diff;
};

const getBufferSnapshot = (terminal, lines) => {
  const buffer = terminal?.buffer?.active;
  if (!terminal || !buffer) {
    return '';
  }
  const maxLines = Number.isFinite(lines) ? Math.max(1, Math.floor(lines)) : 90;
  const start = Math.max(0, buffer.length - maxLines);
  const output = [];
  for (let i = start; i < buffer.length; i += 1) {
    const line = buffer.getLine(i);
    if (!line) {
      output.push('');
      continue;
    }
    const text = line.translateToString(true);
    if (line.isWrapped && output.length) {
      output[output.length - 1] += text;
    } else {
      output.push(text);
    }
  }
  return normalizeActivitySnapshot(output.join('\n'));
};

const stripTrailingPunctuation = (value) => {
  const trimmed = String(value || '').trimEnd();
  return trimmed.replace(TRAILING_PATH_PUNCTUATION, '');
};

const findPathMatches = (value) => {
  const text = String(value || '');
  const matches = [];
  PATH_REGEX.lastIndex = 0;
  let match = PATH_REGEX.exec(text);
  while (match) {
    const prefix = match[1] || '';
    const raw = match[2] || '';
    const startIndex = match.index + prefix.length;
    const cleaned = stripTrailingPunctuation(raw);
    if (cleaned) {
      matches.push({
        raw,
        text: cleaned,
        startIndex,
      });
    }
    match = PATH_REGEX.exec(text);
  }
  return matches;
};

const formatSelectionTime = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const buildSelectionSite = (terminal, position) => {
  if (!terminal || !position) {
    return '';
  }
  const buffer = terminal.buffer?.active;
  if (!buffer) {
    return '';
  }
  let start = position.start || null;
  let end = position.end || null;
  if (!start || !end) {
    return '';
  }
  if (end.y < start.y || (end.y === start.y && end.x < start.x)) {
    [start, end] = [end, start];
  }
  const lines = [];
  for (let row = start.y; row <= end.y; row += 1) {
    const line = buffer.getLine(row);
    const text = line ? line.translateToString(true) : '';
    if (!text) {
      lines.push('');
      continue;
    }
    const clamp = (value) => Math.max(0, Math.min(text.length, value));
    const wrap = (value, from, to) => {
      if (from >= to) {
        return value;
      }
      return `${value.slice(0, from)}\`${value.slice(from, to)}\`${value.slice(to)}`;
    };
    if (start.y === end.y) {
      const from = clamp(start.x);
      const to = clamp(end.x);
      lines.push(wrap(text, from, to));
      continue;
    }
    if (row === start.y) {
      const from = clamp(start.x);
      lines.push(wrap(text, from, text.length));
      continue;
    }
    if (row === end.y) {
      const to = clamp(end.x);
      lines.push(wrap(text, 0, to));
      continue;
    }
    lines.push(wrap(text, 0, text.length));
  }
  return lines.join('\n');
};

const writeSelectionToClipboard = async (selection) => {
  if (!selection) {
    return false;
  }
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(selection);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = selection;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
};

function TerminalPane({
  cell,
  sessionId,
  mode,
  pendingCommand,
  onCommandSent,
  onActivity,
  onSessionAttached,
  fontSize,
  isVisible,
  isActive,
  shortcutBindings,
  sessionTargets,
  onSendSessionText,
  onOpenWorkbenchFile,
  onSelectionContext,
  onReplySelection,
  activityDiffThreshold,
}) {
  const containerRef = useRef(null);
  const entryRef = useRef(null);
  const terminalRef = useRef(null);
  const fitRef = useRef(null);
  const commandQueueRef = useRef([]);
  const lastQueuedRef = useRef(null);
  const lastResizeRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const lastOutputAtRef = useRef(0);
  const deferredResizeRef = useRef(null);
  const resizeLogRef = useRef({});
  const resizeHandlerRef = useRef(null);
  const focusHandlerRef = useRef(null);
  const resizeAttemptsRef = useRef(0);
  const activationWarnedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const bindingIndexRef = useRef(new Map());
  const dispatchRef = useRef(null);
  const pasteTrackerRef = useRef(0);
  const sessionReadyRef = useRef(false);
  const selectionTextRef = useRef('');
  const lastSelectionRef = useRef({
    text: '',
    position: null,
    updatedAt: 0,
  });
  const selectionContextRef = useRef(null);
  const linkProviderRef = useRef(null);
  const activitySnapshotRef = useRef('');
  const activityFrameRef = useRef(null);
  const activityThresholdRef = useRef(DEFAULT_ACTIVITY_DIFF_THRESHOLD);
  const pointerDownRef = useRef(null);
  const mouseOverrideRef = useRef({
    lastEnabled: null,
  });
  const selectionOverrideRef = useRef(false);
  const selectionMouseLockRef = useRef(false);
  const selectionActivationTimerRef = useRef(null);
  const actionBarRef = useRef(null);
  const actionMenuRef = useRef(null);
  const memoSavingRef = useRef(false);
  const selectionServicePatchedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [previewData, setPreviewData] = useState('');
  const [selectionText, setSelectionText] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const cellId = cell?.id;
  const worktreePath = cell?.worktreePath;
  const sendTargets = useMemo(() => {
    const list = Array.isArray(sessionTargets) ? sessionTargets : [];
    return list
      .filter((target) => target && target.cellId && target.sessionId)
      .filter((target) => !(target.cellId === cellId && target.sessionId === sessionId))
      .sort((a, b) => {
        const left = `${a.cellName || a.cellId} ${a.sessionName || a.sessionId}`;
        const right = `${b.cellName || b.cellId} ${b.sessionName || b.sessionId}`;
        return left.localeCompare(right);
      });
  }, [cellId, sessionId, sessionTargets]);
  const showSelectionActions = Boolean(isActive && selectionText);
  const hasSendTargets = sendTargets.length > 0;
  const selectionCount = selectionText ? selectionText.length : 0;
  const selectionCountLabel = selectionCount > 999 ? '999+' : `${selectionCount}`;
  const handleReplySelection = () => {
    const selection = selectionTextRef.current || selectionText;
    if (!selection) {
      return;
    }
    onReplySelection?.(selectionContextRef.current);
  };

  const handleCreateMemo = async () => {
    const selection = selectionTextRef.current || selectionText;
    const trimmed = selection.trim();
    if (!trimmed || !worktreePath || !cellId || !sessionId) {
      return;
    }
    if (memoSavingRef.current) {
      return;
    }
    memoSavingRef.current = true;
    const context = selectionContextRef.current || {};
    const targetMeta =
      (Array.isArray(sessionTargets)
        ? sessionTargets.find(
            (target) => target?.cellId === cellId && target?.sessionId === sessionId
          )
        : null) || {};
    try {
      await createHilItem({
        worktreePath,
        kind: 'memo',
        body: trimmed,
        meta: {
          noteType: 'flash',
          source: 'terminal-selection',
          selection: {
            text: selection,
            site: context.site || '',
            timeTag: context.timeTag || '',
          },
          session: {
            cellId,
            cellName: targetMeta.cellName || cell?.name || '',
            sessionId,
            sessionName: targetMeta.sessionName || sessionId,
          },
        },
      });
    } catch (error) {
      window.agency?.logRuntime?.({
        level: 'warn',
        message: 'terminal selection memo failed',
        meta: {
          cellId,
          sessionId,
          error: error?.message || String(error),
        },
      });
    } finally {
      memoSavingRef.current = false;
    }
  };

  const handleToggleSendMenu = () => {
    if (!hasSendTargets) {
      return;
    }
    setActionMenuOpen((current) => !current);
  };

  const handleSendSelection = (target) => {
    const selection = selectionTextRef.current || selectionText;
    if (!selection || !target?.cellId || !target?.sessionId) {
      return;
    }
    onSendSessionText?.({
      cellId: target.cellId,
      sessionId: target.sessionId,
      text: normalizeSelectionText(selection),
    });
    setActionMenuOpen(false);
  };

  const sendCommand = (payload) => {
    const command = typeof payload === 'string' ? payload : payload?.command;
    const appendEnter = typeof payload === 'string' ? true : payload?.appendEnter !== false;
    const doubleEnter = typeof payload === 'string' ? false : payload?.doubleEnter === true;
    if (!command || !cellId) {
      return;
    }
    const text = String(command).replace(/\r\n/g, '\n');
    window.agency?.writeTerminal({ cellId, sessionId, data: text });
    const enterCount = (appendEnter ? 1 : 0) + (doubleEnter ? 1 : 0);
    for (let i = 0; i < enterCount; i += 1) {
      window.agency?.writeTerminal({ cellId, sessionId, data: '\r' });
    }
    if (onCommandSent) {
      onCommandSent({ cellId, command, appendEnter, doubleEnter });
    }
  };

  useEffect(() => {
    bindingIndexRef.current = buildShortcutIndex(shortcutBindings || []);
  }, [shortcutBindings]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    activityThresholdRef.current = resolveActivityThreshold(activityDiffThreshold);
  }, [activityDiffThreshold]);

  useEffect(() => {
    if (!isActive) {
      selectionTextRef.current = '';
      setSelectionText('');
      setActionMenuOpen(false);
    }
  }, [isActive, sessionId]);

  useEffect(() => {
    if (!selectionText) {
      setActionMenuOpen(false);
    }
  }, [selectionText]);

  useEffect(() => {
    if (!actionMenuOpen) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (actionMenuRef.current?.contains(event.target)) {
        return;
      }
      if (actionBarRef.current?.contains(event.target)) {
        return;
      }
      setActionMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [actionMenuOpen]);

  useEffect(() => {
    dispatchRef.current = (action) =>
      dispatchTerminalAction({
        action,
        cellId,
        sessionId,
        worktreePath,
        logRuntime: window.agency?.logRuntime,
        pasteTracker: pasteTrackerRef,
      });
  }, [cellId, sessionId, worktreePath, onActivity]);

  useEffect(() => {
    if (!cellId || !sessionId || !worktreePath) {
      return undefined;
    }
    setSessionInteractive({ cellId, sessionId, worktreePath, active: Boolean(isActive) });
    return () => {
      setSessionInteractive({ cellId, sessionId, worktreePath, active: false });
    };
  }, [cellId, sessionId, worktreePath, isActive]);

  useEffect(() => {
    if (!cellId || !sessionId) {
      return undefined;
    }
    const unsubscribe = onTerminalDetached?.((payload) => {
      if (!payload || payload.cellId !== cellId || payload.sessionId !== sessionId) {
        return;
      }
      if (entryRef.current) {
        entryRef.current.started = false;
        entryRef.current.starting = null;
      }
      setSessionReady(false);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [cellId, sessionId]);

  useEffect(() => {
    sessionReadyRef.current = sessionReady;
    if (terminalRef.current) {
      terminalRef.current.options.disableStdin = !sessionReady;
    }
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady || !worktreePath || !sessionId) {
      return;
    }
    if (selectionActivationTimerRef.current) {
      clearTimeout(selectionActivationTimerRef.current);
      selectionActivationTimerRef.current = null;
    }
    mouseOverrideRef.current.lastEnabled = null;
    selectionOverrideRef.current = false;
    selectionMouseLockRef.current = false;
    setSessionMouse({ worktreePath, sessionId, enabled: true }).catch(() => undefined);
    mouseOverrideRef.current.lastEnabled = true;
  }, [sessionReady, worktreePath, sessionId]);

  useEffect(() => {
    if (!cellId || !sessionId || !containerRef.current || !worktreePath) {
      return undefined;
    }
    commandQueueRef.current = [];
    lastQueuedRef.current = null;
    resizeAttemptsRef.current = 0;

    const entry = ensureTerminalEntry({ cellId, sessionId, fontSize });
    entryRef.current = entry;
    terminalRef.current = entry?.terminal || null;
    fitRef.current = entry?.fitAddon || null;

    if (!entry) {
      return undefined;
    }

    attachTerminal({ entry, container: containerRef.current });
    if (!selectionServicePatchedRef.current) {
      const selectionService = entry?.terminal?._core?._selectionService;
      if (selectionService && typeof selectionService.shouldForceSelection === 'function') {
        // xterm.js only forces selection on Shift/Option; we extend to Command on macOS.
        if (!selectionService._agencyOriginalShouldForceSelection) {
          selectionService._agencyOriginalShouldForceSelection =
            selectionService.shouldForceSelection.bind(selectionService);
        }
        selectionService.shouldForceSelection = (event) => {
          if (event?.metaKey) {
            return true;
          }
          if (selectionService._agencyOriginalShouldForceSelection) {
            return selectionService._agencyOriginalShouldForceSelection(event);
          }
          return Boolean(event?.shiftKey || event?.altKey);
        };
        selectionServicePatchedRef.current = true;
      }
    }
    ensureInputListener({
      entry,
      onInput: (data) => {
        if (!sessionReadyRef.current) {
          return;
        }
        window.agency?.writeTerminal({ cellId, sessionId, data });
      },
    });

    setSessionReady(entry.started);
    setErrorMessage('');
    activitySnapshotRef.current = '';
    if (activityFrameRef.current) {
      cancelAnimationFrame(activityFrameRef.current);
      activityFrameRef.current = null;
    }

    if (linkProviderRef.current?.dispose) {
      linkProviderRef.current.dispose();
    }
    const resolvePathTarget = (rawText) => {
      const cleaned = stripTrailingPunctuation(rawText || '');
      if (!cleaned) {
        return null;
      }
      const match = /^(.*?)(?::(\d+)(?::(\d+))?)?$/.exec(cleaned);
      if (!match) {
        return null;
      }
      let targetPath = match[1] || '';
      const line = match[2] ? Number(match[2]) : null;
      const column = match[3] ? Number(match[3]) : null;
      if (!targetPath) {
        return null;
      }
      targetPath = targetPath.replace(/\\/g, '/');
      if (targetPath.startsWith('./')) {
        targetPath = targetPath.slice(2);
      }
      const normalizedRoot = worktreePath ? String(worktreePath).replace(/\\/g, '/').replace(/\/+$/, '') : '';
      if (targetPath.startsWith('/')) {
        if (!normalizedRoot || !targetPath.startsWith(`${normalizedRoot}/`)) {
          return null;
        }
        targetPath = targetPath.slice(normalizedRoot.length + 1);
      }
      return {
        path: targetPath,
        rootPath: normalizedRoot || worktreePath,
        line: Number.isFinite(line) ? line : null,
        column: Number.isFinite(column) ? column : null,
      };
    };
    const handleLinkActivate = (rawText, event) => {
      const isMac = navigator.platform?.toLowerCase().includes('mac');
      const modKey = isMac ? event?.metaKey : event?.ctrlKey;
      if (!modKey) {
        return;
      }
      const resolved = resolvePathTarget(rawText);
      if (!resolved?.path) {
        return;
      }
      onOpenWorkbenchFile?.({
        path: resolved.path,
        rootPath: resolved.rootPath,
        line: resolved.line,
        column: resolved.column,
        focusView: true,
        cellId,
      });
    };
    linkProviderRef.current = entry.terminal.registerLinkProvider({
      provideLinks: (bufferLineNumber, callback) => {
        const buffer = entry.terminal?.buffer?.active;
        const line = buffer?.getLine(bufferLineNumber);
        const columnMap = [];
        const text = line ? line.translateToString(true, undefined, undefined, columnMap) : '';
        if (!text) {
          callback(undefined);
          return;
        }
        const matches = findPathMatches(text);
        if (!matches.length) {
          callback(undefined);
          return;
        }
        const resolveColumn = (index) => {
          if (!columnMap.length) {
            return index;
          }
          const clamped = Math.max(0, Math.min(index, columnMap.length - 1));
          const column = columnMap[clamped];
          return Number.isFinite(column) ? column : index;
        };
        const resolveRange = (match) => {
          const length = match.text.length;
          const startCol = resolveColumn(match.startIndex);
          if (length <= 0) {
            return {
              start: { x: startCol + 1, y: bufferLineNumber },
              end: { x: startCol + 1, y: bufferLineNumber },
            };
          }
          const endColRaw = resolveColumn(match.startIndex + length);
          const endCol = Math.max(startCol, endColRaw - 1);
          return {
            start: { x: startCol + 1, y: bufferLineNumber },
            end: { x: endCol + 1, y: bufferLineNumber },
          };
        };
        const links = matches.map((match) => ({
          text: match.text,
          range: resolveRange(match),
          activate: (event) => handleLinkActivate(match.text, event),
        }));
        callback(links);
      },
    });

    let resizeFrame = null;
    const MIN_COLS = 20;
    const MIN_ROWS = 5;
    const OUTPUT_SUPPRESS_MS = 220;
    const LOG_THROTTLE_MS = 1200;

    const logResizeSkip = (reason, meta) => {
      const now = Date.now();
      const last = resizeLogRef.current[reason] || 0;
      if (now - last < LOG_THROTTLE_MS) {
        return;
      }
      resizeLogRef.current[reason] = now;
      window.agency?.logRuntime?.({
        level: 'warn',
        message: `terminal resize skipped: ${reason}`,
        meta: {
          cellId,
          sessionId,
          mode,
          ...meta,
        },
      });
    };

    const scheduleDeferredResize = (delay, reason) => {
      if (resizeAttemptsRef.current >= 6) {
        return;
      }
      resizeAttemptsRef.current += 1;
      if (deferredResizeRef.current) {
        return;
      }
      deferredResizeRef.current = setTimeout(() => {
        deferredResizeRef.current = null;
        scheduleResize(true, reason);
      }, delay);
    };

    const scheduleResize = (force = false, reason = 'auto') => {
      if (!terminalRef.current || !fitRef.current || !containerRef.current) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastOutputAtRef.current < OUTPUT_SUPPRESS_MS) {
        logResizeSkip('output-throttle', { reason });
        scheduleDeferredResize(250, 'deferred-output');
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) {
        logResizeSkip('zero-dimensions', { width, height, reason });
        scheduleDeferredResize(120, 'deferred-zero');
        return;
      }
      if (!force && width === lastResizeRef.current.width && height === lastResizeRef.current.height) {
        return;
      }
      const proposed = fitRef.current.proposeDimensions?.();
      if (!proposed || !proposed.cols || !proposed.rows) {
        logResizeSkip('missing-dimensions', { width, height, reason });
        scheduleDeferredResize(140, 'deferred-missing');
        return;
      }
      if (proposed.cols < MIN_COLS || proposed.rows < MIN_ROWS) {
        logResizeSkip('below-minimum', {
          width,
          height,
          cols: proposed.cols,
          rows: proposed.rows,
          reason,
        });
        return;
      }
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (!terminalRef.current || !fitRef.current || !containerRef.current) {
          return;
        }
        fitRef.current.fit();
        const { cols, rows } = terminalRef.current;
        if (cols < MIN_COLS || rows < MIN_ROWS) {
          logResizeSkip('below-minimum', { cols, rows, reason });
          return;
        }
        if (!force && cols === lastResizeRef.current.cols && rows === lastResizeRef.current.rows) {
          lastResizeRef.current = { width, height, cols, rows };
          return;
        }
        resizeAttemptsRef.current = 0;
        lastResizeRef.current = { width, height, cols, rows };
        window.agency?.resizeTerminal({
          cellId,
          sessionId,
          cols,
          rows,
        });
      });
    };

    resizeHandlerRef.current = scheduleResize;
    focusHandlerRef.current = () => {
      terminalRef.current?.focus();
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleResize(false, 'resize-observer'))
        : null;
    if (resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }
    scheduleResize(true, 'init');
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => scheduleResize(true, 'fonts-ready'))
        .catch(() => {});
    }
    if (isActiveRef.current) {
      terminalRef.current?.focus();
    }

    const setTmuxMouseEnabled = (enabled, { force = false } = {}) => {
      if (!worktreePath || !sessionId) {
        return;
      }
      if (!force && mouseOverrideRef.current.lastEnabled === enabled) {
        return;
      }
      mouseOverrideRef.current.lastEnabled = enabled;
      setSessionMouse({ worktreePath, sessionId, enabled }).catch(() => undefined);
    };

    const clearSelectionActivationTimer = () => {
      if (!selectionActivationTimerRef.current) {
        return;
      }
      clearTimeout(selectionActivationTimerRef.current);
      selectionActivationTimerRef.current = null;
    };

    const scheduleSelectionActivationGuard = () => {
      clearSelectionActivationTimer();
      selectionMouseLockRef.current = true;
      setTmuxMouseEnabled(false, { force: true });
      selectionActivationTimerRef.current = setTimeout(() => {
        selectionActivationTimerRef.current = null;
        const selectionActive = Boolean(
          terminalRef.current?.hasSelection?.() || selectionTextRef.current
        );
        if (selectionActive) {
          selectionMouseLockRef.current = true;
          setTmuxMouseEnabled(false, { force: true });
          return;
        }
        selectionMouseLockRef.current = false;
        ensureTmuxMouseOn();
      }, 180);
    };

    const ensureTmuxMouseOn = () => {
      if (selectionOverrideRef.current || selectionMouseLockRef.current) {
        return;
      }
      if (terminalRef.current?.hasSelection?.() || selectionTextRef.current) {
        return;
      }
      const tracking = terminalRef.current?.modes?.mouseTrackingMode || 'none';
      setTmuxMouseEnabled(true, { force: tracking === 'none' });
    };

    const bufferDisposable = entry.terminal.onBufferChange?.(() => {
      ensureTmuxMouseOn();
    });
    ensureTmuxMouseOn();

    const handlePointerDown = (event) => {
      terminalRef.current?.focus();
      pointerDownRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
      const terminal = terminalRef.current;
      const isAlternate = terminal?.buffer?.active?.type === 'alternate';
      const wantsSelectionOverride =
        !isAlternate &&
        event.button === 0 &&
        (event.shiftKey || event.altKey || event.metaKey);
      if (wantsSelectionOverride) {
        clearSelectionActivationTimer();
        selectionOverrideRef.current = true;
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      } else {
        clearSelectionActivationTimer();
        selectionOverrideRef.current = false;
        if (!terminal?.hasSelection?.() && !selectionTextRef.current) {
          selectionMouseLockRef.current = false;
          ensureTmuxMouseOn();
        }
      }
    };
    const handlePointerUp = () => {
      if (!pointerDownRef.current) {
        return;
      }
      const terminal = terminalRef.current;
      const hadSelectionOverride = selectionOverrideRef.current;
      const selectionActive = Boolean(
        terminal?.hasSelection?.() || selectionTextRef.current
      );
      if (hadSelectionOverride) {
        selectionOverrideRef.current = false;
      }
      if (selectionActive) {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      } else if (hadSelectionOverride) {
        scheduleSelectionActivationGuard();
      } else {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = false;
        ensureTmuxMouseOn();
      }
      pointerDownRef.current = null;
    };
    containerRef.current.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mouseup', handlePointerUp);

    const sendExtendedKey = (data) => {
      if (!cellId || !sessionId || !window.agency?.writeTerminal || !sessionReadyRef.current) {
        return;
      }
      window.agency.writeTerminal({ cellId, sessionId, data });
    };

    const resolveShiftEnterPayload = () => {
      const terminal = terminalRef.current;
      if (terminal?.modes?.bracketedPasteMode) {
        return '\x1b[200~\n\x1b[201~';
      }
      return '\x1b[13;2u';
    };

    const resolveModifierArrowPayload = (event) => {
      const mapping = {
        ArrowUp: 'A',
        ArrowDown: 'B',
        ArrowRight: 'C',
        ArrowLeft: 'D',
      };
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        return event.key === 'ArrowLeft' ? '\x1bb' : '\x1bf';
      }
      if (
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        return event.key === 'ArrowLeft' ? '\x1b[H' : '\x1b[F';
      }
      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        mapping[event.key]
      ) {
        return `\x1b[1;5${mapping[event.key]}`;
      }
      return '';
    };

    const handleModifierArrow = (event) => {
      const payload = resolveModifierArrowPayload(event);
      if (!payload) {
        return false;
      }
      if (event.type === 'keydown') {
        sendExtendedKey(payload);
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const handleSelectionCopy = (event) => {
      if (!event.metaKey || event.ctrlKey || event.altKey) {
        return false;
      }
      if (String(event.key || '').toLowerCase() !== 'c') {
        return false;
      }
      const selection = entry.terminal?.getSelection?.() || selectionTextRef.current || '';
      if (!selection) {
        return false;
      }
      if (event.type === 'keydown') {
        writeSelectionToClipboard(selection).catch((error) => {
          window.agency?.logRuntime?.({
            level: 'warn',
            message: 'terminal copy failed',
            meta: {
              cellId,
              sessionId,
              error: error?.message || String(error),
            },
          });
        });
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const handleExtendedEnter = (event) => {
      if (
        event.key !== 'Enter' ||
        !event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return false;
      }
      if (event.type === 'keydown') {
        sendExtendedKey(resolveShiftEnterPayload());
      }
      if (event.type === 'keydown' || event.type === 'keypress' || event.type === 'keyup') {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    const isActionableBinding = (binding) => {
      if (!binding) {
        return false;
      }
      const action = binding.action || {};
      const type = action.type || 'sendText';
      if (type === 'pasteFiles') {
        return true;
      }
      if (type === 'sendKeys') {
        return Array.isArray(action.keys) && action.keys.some((key) => String(key ?? '').length > 0);
      }
      if (type === 'sendText') {
        return action.text !== undefined && action.text !== null && String(action.text).length > 0;
      }
      return false;
    };

    const handleCustomKeyEvent = (event) => {
      if (!sessionReadyRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (
        event.isComposing ||
        event.key === 'Process' ||
        event.key === 'Dead' ||
        event.key === 'Unidentified' ||
        event.keyCode === 229
      ) {
        return true;
      }
      if (handleSelectionCopy(event)) {
        return false;
      }
      const index = bindingIndexRef.current;
      const binding = index && index.size > 0 ? matchShortcutBinding(event, index) : null;
      if (binding && isActionableBinding(binding)) {
        if (event.type === 'keydown') {
          dispatchRef.current?.(binding.action || {});
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (handleModifierArrow(event)) {
        return false;
      }
      if (handleExtendedEnter(event)) {
        return false;
      }
      return true;
    };
    entry.terminal.attachCustomKeyEventHandler(handleCustomKeyEvent);

    const handleWheelEvent = (event) => {
      const terminal = terminalRef.current;
      if (!terminal) {
        return true;
      }
      if (event.ctrlKey) {
        return false;
      }
      const mouseMode = terminal.modes?.mouseTrackingMode || 'none';
      const activeBuffer = terminal.buffer?.active;
      const isAlternate = activeBuffer?.type === 'alternate';
      if (mouseMode !== 'none' && !event.altKey) {
        return true;
      }
      const delta = event.deltaY;
      if (!delta) {
        return false;
      }
      const direction = delta > 0 ? 1 : -1;
      let lines = 0;
      if (event.deltaMode === 1) {
        lines = delta;
      } else {
        const base = Math.round(Math.abs(delta) / 40);
        lines = (base === 0 ? 1 : base) * direction;
      }
      if (isAlternate) {
        const stepCount = Math.min(3, Math.max(1, Math.abs(lines || 1)));
        const sequence = direction < 0 ? '\x1b[5~' : '\x1b[6~';
        sendExtendedKey(sequence.repeat(stepCount));
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      if (mouseMode !== 'none' && event.altKey) {
        if (lines) {
          terminal.scrollLines(lines);
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      return true;
    };
    entry.terminal.attachCustomWheelEventHandler(handleWheelEvent);

    const selectionDisposable = entry.terminal.onSelectionChange(() => {
      if (!isActiveRef.current) {
        return;
      }
      const selection = entry.terminal?.getSelection?.() || '';
      const isAlternate = entry.terminal?.buffer?.active?.type === 'alternate';
      if (!selection) {
        clearSelectionActivationTimer();
        selectionTextRef.current = '';
        setSelectionText('');
        lastSelectionRef.current = {
          text: '',
          position: null,
          updatedAt: Date.now(),
        };
        selectionOverrideRef.current = false;
        selectionMouseLockRef.current = false;
        if (!isAlternate) {
          ensureTmuxMouseOn();
        }
        return;
      }
      if (!isAlternate) {
        clearSelectionActivationTimer();
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
      }
      const position = entry.terminal?.getSelectionPosition?.() || null;
      const updatedAt = Date.now();
      const rawSite = buildSelectionSite(entry.terminal, position);
      const site = rawSite || `\`${selection}\``;
      const timeTag = formatSelectionTime(updatedAt);
      selectionTextRef.current = selection;
      lastSelectionRef.current = {
        text: selection,
        position,
        site,
        timeTag,
        updatedAt,
      };
      selectionContextRef.current = {
        text: selection,
        site,
        timeTag,
        updatedAt,
        cellId,
        sessionId,
      };
      onSelectionContext?.({
        text: selection,
        site,
        timeTag,
        updatedAt,
        cellId,
        sessionId,
      });
      setSelectionText(selection);
    });

    const handleContextMenu = (event) => {
      const selection = entry.terminal?.getSelection?.() || '';
      if (!selection) {
        return;
      }
      event.preventDefault();
      writeSelectionToClipboard(selection).catch((error) => {
        window.agency?.logRuntime?.({
          level: 'warn',
          message: 'terminal copy failed',
          meta: {
            cellId,
            sessionId,
            error: error?.message || String(error),
          },
        });
      });
    };

    const contextMenuTargets = [entry.terminal.element, containerRef.current].filter(Boolean);
    contextMenuTargets.forEach((target) => {
      target.addEventListener('contextmenu', handleContextMenu);
    });

    const scheduleActivityCheck = () => {
      if (activityFrameRef.current) {
        return;
      }
      activityFrameRef.current = requestAnimationFrame(() => {
        activityFrameRef.current = null;
        const snapshot = getBufferSnapshot(entry.terminal, PREVIEW_LINES);
        const previous = activitySnapshotRef.current || '';
        const threshold = activityThresholdRef.current;
        if (!snapshot && !previous) {
          return;
        }
        activitySnapshotRef.current = snapshot;
        if (countDiffChars(previous, snapshot, threshold) >= threshold) {
          onActivity?.({ cellId, sessionId });
        }
      });
    };

    const unsubscribe = window.agency?.onTerminalData((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        lastOutputAtRef.current = Date.now();
        entry.terminal.write(payload.data, scheduleActivityCheck);
      }
    });
    const unsubscribeError = window.agency?.onTerminalError((payload) => {
      if (payload?.cellId === cellId && payload?.sessionId === sessionId) {
        setErrorMessage(payload.message || 'Terminal failed to start.');
        window.agency?.logRuntime?.({
          level: 'error',
          message: 'terminal error received',
          meta: {
            cellId,
            sessionId,
            mode,
            error: payload.message,
          },
        });
      }
    });

    const handleWindowResize = () => scheduleResize(false, 'window-resize');
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handlePointerDown);
      }
      window.removeEventListener('mouseup', handlePointerUp);
      clearSelectionActivationTimer();
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
      if (activityFrameRef.current) {
        cancelAnimationFrame(activityFrameRef.current);
        activityFrameRef.current = null;
      }
      if (deferredResizeRef.current) {
        clearTimeout(deferredResizeRef.current);
      }
      contextMenuTargets.forEach((target) => {
        target.removeEventListener('contextmenu', handleContextMenu);
      });
      if (unsubscribe) {
        unsubscribe();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
      if (selectionDisposable?.dispose) {
        selectionDisposable.dispose();
      }
      if (bufferDisposable?.dispose) {
        bufferDisposable.dispose();
      }
      if (linkProviderRef.current?.dispose) {
        linkProviderRef.current.dispose();
      }
      mouseOverrideRef.current.lastEnabled = null;
      selectionOverrideRef.current = false;
      selectionMouseLockRef.current = false;
      linkProviderRef.current = null;
      resizeHandlerRef.current = null;
      focusHandlerRef.current = null;
      setSessionReady(false);
      if (entryRef.current) {
        entryRef.current.container = null;
      }
      entryRef.current = null;
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [cellId, sessionId, worktreePath]);

  useEffect(() => {
    if (!cellId || !sessionId || !worktreePath || !isActive || sessionReady) {
      if (sessionReady) {
        setPreviewData('');
      }
      return undefined;
    }
    let canceled = false;
    const cached = getCachedSessionMapPreview({ worktreePath, cellId, sessionId });
    if (cached?.data) {
      setPreviewData(normalizePreviewData(cached.data));
    } else {
      setPreviewData('');
    }
    primeSessionMapPreview({
      worktreePath,
      cellId,
      sessionId,
      lines: PREVIEW_LINES,
      cacheOnly: true,
    })
      .then((result) => {
        if (canceled) {
          return;
        }
        if (result?.data) {
          setPreviewData(normalizePreviewData(result.data));
        }
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [cellId, sessionId, worktreePath, isActive, sessionReady]);

  useEffect(() => {
    if (!entryRef.current || !isActive || !cellId || !sessionId || !worktreePath) {
      return undefined;
    }
    let canceled = false;
    ensureStarted({
      entry: entryRef.current,
      payload: {
        cellId,
        sessionId,
        worktreePath,
        mode,
      },
    })
      .then((result) => {
        if (canceled) {
          return;
        }
        setSessionReady(result.started);
        if (result.didStart) {
          setTimeout(() => resizeHandlerRef.current?.(true, 'post-start'), 60);
          if (onSessionAttached) {
            onSessionAttached({ cellId, sessionId });
          }
          if (commandQueueRef.current.length) {
            const queue = [...commandQueueRef.current];
            commandQueueRef.current = [];
            queue.forEach((item) => sendCommand(item));
          }
        }
      })
      .catch((error) => {
        if (!canceled) {
          setErrorMessage(error?.message || 'Terminal failed to start.');
          window.agency?.logRuntime?.({
            level: 'error',
            message: 'terminal start failed',
            meta: {
              cellId,
              sessionId,
              mode,
              error: error?.message || String(error),
            },
          });
          console.error(error);
        }
      });
    return () => {
      canceled = true;
    };
  }, [isActive, cellId, sessionId, worktreePath, mode]);

  useEffect(() => {
    if (!pendingCommand || !cellId || !isActive || pendingCommand.cellId !== cellId) {
      return;
    }
    if (pendingCommand.sessionId && pendingCommand.sessionId !== sessionId) {
      return;
    }
    const commandKey = `${pendingCommand.command ?? ''}::${pendingCommand.appendEnter !== false ? '1' : '0'}::${
      pendingCommand.doubleEnter ? '1' : '0'
    }`;
    if (commandKey === lastQueuedRef.current) {
      return;
    }
    lastQueuedRef.current = commandKey;
    if (sessionReady) {
      sendCommand(pendingCommand);
    } else {
      commandQueueRef.current.push({
        command: pendingCommand.command,
        appendEnter: pendingCommand.appendEnter,
        doubleEnter: pendingCommand.doubleEnter,
      });
    }
  }, [pendingCommand, sessionReady, cellId, sessionId, isActive]);

  useEffect(() => {
    if (!terminalRef.current || !fontSize) {
      return;
    }
    const nextFontSize = Number(fontSize);
    if (!Number.isFinite(nextFontSize) || nextFontSize <= 0) {
      return;
    }
    if (terminalRef.current.options.fontSize === nextFontSize) {
      return;
    }
    terminalRef.current.options.fontSize = nextFontSize;
    terminalRef.current.refresh(0, terminalRef.current.rows - 1);
    resizeHandlerRef.current?.(true, 'font-size');
  }, [fontSize]);

  useEffect(() => {
    if (!isVisible || !isActive || !terminalRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
      resizeHandlerRef.current?.(true, 'visible');
      focusHandlerRef.current?.();
    });
  }, [isVisible, isActive]);

  useEffect(() => {
    if (!sessionReady || !isVisible || !isActive) {
      return undefined;
    }
    if (!terminalRef.current || !resizeHandlerRef.current) {
      if (!activationWarnedRef.current) {
        activationWarnedRef.current = true;
        window.agency?.logRuntime?.({
          level: 'warn',
          message: 'terminal activation refresh skipped',
          meta: { cellId, sessionId },
        });
      }
      return undefined;
    }
    let frame = null;
    const timeout = setTimeout(() => {
      resizeHandlerRef.current?.(true, 'visibility-stabilize');
    }, 120);
    frame = requestAnimationFrame(() => {
      terminalRef.current?.refresh(0, terminalRef.current.rows - 1);
      resizeHandlerRef.current?.(true, 'visibility-refresh');
    });
    return () => {
      clearTimeout(timeout);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [sessionReady, isVisible, isActive, cellId, sessionId]);

  const showConnecting = isActive && !sessionReady;
  const showPreview = showConnecting && Boolean(previewData);

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-amber-200">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {showSelectionActions ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            ref={actionBarRef}
            className="pointer-events-auto absolute right-4 top-4 flex items-center gap-1 rounded-xl border border-border/40 bg-popover/90 px-2 py-1.5 text-[10px] text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-popover/95"
          >
            <div className="flex flex-col px-1">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Selected
              </span>
              <span className="text-[10px] font-medium text-foreground/90 font-mono">
                {selectionCountLabel}
              </span>
            </div>
            <div className="h-4 w-px bg-border/40" />
            <button
              type="button"
              onClick={handleReplySelection}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary text-muted-foreground"
            >
              <MessageSquarePlus size={11} className="text-primary/70 group-hover:text-primary transition-colors" />
              <span>Reply</span>
            </button>
            <button
              type="button"
              onClick={handleCreateMemo}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40 hover:text-foreground text-muted-foreground"
            >
              <StickyNote size={11} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSendMenu}
              disabled={!hasSendTargets}
              className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40 hover:text-foreground text-muted-foreground disabled:opacity-40"
            >
              <Send size={11} className="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              <span>Send</span>
              <ChevronDown size={10} className="opacity-50" />
            </button>
          </div>
          {actionMenuOpen ? (
            <div
              ref={actionMenuRef}
              className="pointer-events-auto absolute right-4 top-[3.5rem] w-64 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 py-1 text-[11px] shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2 py-1.5 border-b border-border/10 mb-1">
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Send To Session
                </div>
              </div>
              {hasSendTargets ? (
                sendTargets.map((target) => (
                  <button
                    key={`${target.cellId}:${target.sessionId}`}
                    type="button"
                    onClick={() => handleSendSelection(target)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
                  >
                    <AgentAvatarBadge
                      avatarId={resolveAvatarId(target.avatar || target.sessionId || target.cellId)}
                      size={14}
                      showRing={false}
                    />
                    <span className="flex-1 truncate opacity-80">
                      {target.cellName || target.cellId} / {target.sessionName || target.sessionId}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/40 font-medium">
                      {target.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-[10px] text-muted-foreground/50">No active sessions</div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {showPreview ? (
        <div className="absolute inset-0 overflow-auto no-scrollbar bg-black/60 text-[11px] text-slate-200/80 font-mono">
          <pre className="min-h-full w-full whitespace-pre-wrap px-4 py-3 leading-relaxed">
            {previewData}
          </pre>
        </div>
      ) : null}
      {showConnecting ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary/80">
            <RefreshCw size={12} className="animate-spin" />
            <span>Connecting</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TerminalPane;
