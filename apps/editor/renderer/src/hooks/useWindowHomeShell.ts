import { useCallback, useEffect, useMemo, useState } from 'react';

import { disposeWindowHomeShell } from '../services/agencyBridge';
import { disposeWindowHomeShellEntry } from '../terminal/windowHomeShellManager';

export type WindowHomeShellStatus = 'idle' | 'starting' | 'ready' | 'exited' | 'error';

export function useWindowHomeShell({
  homePath,
  projectReady,
}: {
  homePath: string;
  projectReady: boolean;
}) {
  const [shellVisible, setShellVisible] = useState(false);
  const [shellStatus, setShellStatus] = useState<WindowHomeShellStatus>('idle');
  const [shellError, setShellError] = useState('');
  const [shellMeta, setShellMeta] = useState({
    cwd: homePath || '',
    shellPath: '',
  });

  const closeShell = useCallback(() => {
    setShellVisible(false);
    setShellStatus('idle');
    setShellError('');
    setShellMeta({
      cwd: homePath || '',
      shellPath: '',
    });
    disposeWindowHomeShellEntry();
    disposeWindowHomeShell();
  }, [homePath]);

  const openShell = useCallback(() => {
    setShellVisible(true);
    setShellStatus((current) => (current === 'ready' ? current : 'starting'));
    setShellError('');
  }, []);

  const handleShellReady = useCallback(
    (payload: { cwd?: string; shellPath?: string } = {}) => {
      setShellStatus('ready');
      setShellError('');
      setShellMeta({
        cwd: String(payload.cwd || homePath || '').trim(),
        shellPath: String(payload.shellPath || '').trim(),
      });
    },
    [homePath]
  );

  const handleShellExit = useCallback(() => {
    setShellVisible(false);
    setShellStatus('exited');
  }, []);

  const handleShellError = useCallback((message: string) => {
    const normalized = String(message || '').trim();
    setShellVisible(false);
    setShellStatus(normalized ? 'error' : 'idle');
    setShellError(normalized);
  }, []);

  useEffect(() => {
    if (!projectReady) {
      return;
    }
    if (shellVisible || shellStatus !== 'idle') {
      closeShell();
    }
  }, [closeShell, projectReady, shellStatus, shellVisible]);

  const shellSummary = useMemo(
    () => ({
      visible: shellVisible,
      status: shellStatus,
      error: shellError,
      cwd: shellMeta.cwd || homePath || '',
      shellPath: shellMeta.shellPath,
      isRunning: shellStatus === 'ready',
    }),
    [homePath, shellError, shellMeta.cwd, shellMeta.shellPath, shellStatus, shellVisible]
  );

  return {
    shellVisible,
    shellSummary,
    openShell,
    closeShell,
    handleShellReady,
    handleShellExit,
    handleShellError,
  };
}
