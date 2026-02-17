const SELECTION_ACTIVATION_GUARD_DELAY_MS = 180;

export const createTerminalSelectionMouseController = ({
  terminalRef,
  selectionTextRef,
  pointerDownRef,
  mouseOverrideRef,
  selectionOverrideRef,
  selectionMouseLockRef,
  selectionActivationTimerRef,
  setSessionMouse,
  worktreePath,
  sessionId,
}: any) => {
  const setTmuxMouseEnabled = (enabled: boolean, { force = false }: { force?: boolean } = {}) => {
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

  const scheduleSelectionActivationGuard = () => {
    clearSelectionActivationTimer();
    selectionMouseLockRef.current = true;
    setTmuxMouseEnabled(false, { force: true });
    selectionActivationTimerRef.current = setTimeout(() => {
      selectionActivationTimerRef.current = null;
      const selectionActive = Boolean(terminalRef.current?.hasSelection?.() || selectionTextRef.current);
      if (selectionActive) {
        selectionMouseLockRef.current = true;
        setTmuxMouseEnabled(false, { force: true });
        return;
      }
      selectionMouseLockRef.current = false;
      ensureTmuxMouseOn();
    }, SELECTION_ACTIVATION_GUARD_DELAY_MS);
  };

  const handlePointerDown = (event: MouseEvent) => {
    terminalRef.current?.focus();
    pointerDownRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
    const terminal = terminalRef.current;
    const isAlternate = terminal?.buffer?.active?.type === 'alternate';
    const wantsSelectionOverride =
      !isAlternate && event.button === 0 && (event.shiftKey || event.altKey || event.metaKey);
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
    const selectionActive = Boolean(terminal?.hasSelection?.() || selectionTextRef.current);
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

  const reset = () => {
    clearSelectionActivationTimer();
    mouseOverrideRef.current.lastEnabled = null;
    selectionOverrideRef.current = false;
    selectionMouseLockRef.current = false;
    pointerDownRef.current = null;
  };

  return {
    setTmuxMouseEnabled,
    clearSelectionActivationTimer,
    ensureTmuxMouseOn,
    handlePointerDown,
    handlePointerUp,
    reset,
  };
};

