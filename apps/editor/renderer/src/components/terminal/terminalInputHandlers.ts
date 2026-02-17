const MODIFIER_ARROW_SUFFIX: Record<string, string> = {
  ArrowUp: 'A',
  ArrowDown: 'B',
  ArrowRight: 'C',
  ArrowLeft: 'D',
};

const isKeyCaptureEventType = (eventType: string) =>
  eventType === 'keydown' || eventType === 'keypress' || eventType === 'keyup';

const isActionableBinding = (binding: any) => {
  if (!binding) {
    return false;
  }
  const action = binding.action || {};
  const type = action.type || 'sendText';
  if (type === 'pasteFiles') {
    return true;
  }
  if (type === 'sendKeys') {
    return Array.isArray(action.keys) && action.keys.some((key: unknown) => String(key ?? '').length > 0);
  }
  if (type === 'sendText') {
    return action.text !== undefined && action.text !== null && String(action.text).length > 0;
  }
  return false;
};

const resolveModifierArrowPayload = (event: KeyboardEvent) => {
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
    MODIFIER_ARROW_SUFFIX[event.key]
  ) {
    return `\x1b[1;5${MODIFIER_ARROW_SUFFIX[event.key]}`;
  }
  return '';
};

export const attachTerminalInputHandlers = ({
  entry,
  terminalRef,
  sessionReadyRef,
  selectionTextRef,
  bindingIndexRef,
  dispatchRef,
  cellId,
  sessionId,
  writeTerminal,
  matchShortcutBinding,
  writeSelectionToClipboard,
  logRuntime,
}: any) => {
  const sendExtendedKey = (data: string) => {
    if (!cellId || !sessionId || !sessionReadyRef.current) {
      return;
    }
    writeTerminal({ cellId, sessionId, data });
  };

  const resolveShiftEnterPayload = () => {
    const terminal = terminalRef.current;
    if (terminal?.modes?.bracketedPasteMode) {
      return '\x1b[200~\n\x1b[201~';
    }
    return '\x1b[13;2u';
  };

  const handleModifierArrow = (event: KeyboardEvent) => {
    const payload = resolveModifierArrowPayload(event);
    if (!payload) {
      return false;
    }
    if (event.type === 'keydown') {
      sendExtendedKey(payload);
    }
    if (isKeyCaptureEventType(event.type)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  };

  const handleSelectionCopy = (event: KeyboardEvent) => {
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
      writeSelectionToClipboard(selection).catch((error: any) => {
        logRuntime({
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
    if (isKeyCaptureEventType(event.type)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  };

  const handleExtendedEnter = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    if (event.type === 'keydown') {
      sendExtendedKey(resolveShiftEnterPayload());
    }
    if (isKeyCaptureEventType(event.type)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  };

  const handleCustomKeyEvent = (event: KeyboardEvent) => {
    if (!sessionReadyRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    if (
      (event as any).isComposing ||
      event.key === 'Process' ||
      event.key === 'Dead' ||
      event.key === 'Unidentified' ||
      (event as any).keyCode === 229
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

  const handleWheelEvent = (event: WheelEvent) => {
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
};

