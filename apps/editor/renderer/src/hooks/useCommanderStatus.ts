import { useEffect, useMemo, useState } from 'react';

import { getCommanderStatus, isAgencyAvailable } from '../services/agencyBridge';

const EMPTY_STATUS: {
  ready: boolean;
  configured: boolean;
  commandAvailable: boolean;
  connected: boolean;
  reason: string;
  missingRequired: string[];
  checkedAt: string;
} = Object.freeze({
  ready: false,
  configured: false,
  commandAvailable: false,
  connected: false,
  reason: '',
  missingRequired: [],
  checkedAt: '',
});

export function useCommanderStatus({ worktreePath = '' } = {}) {
  const [status, setStatus] = useState(EMPTY_STATUS);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      if (!isAgencyAvailable()) {
        if (!cancelled) {
          setStatus({
            ...EMPTY_STATUS,
            reason: 'IPC unavailable.',
          });
        }
        return;
      }
      try {
        const nextStatus = await getCommanderStatus({
          worktreePath,
        });
        if (!cancelled) {
          setStatus({
            ...EMPTY_STATUS,
            ...(nextStatus || {}),
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          setStatus({
            ...EMPTY_STATUS,
            reason: error?.message || 'Failed to load Commander status.',
          });
        }
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [worktreePath]);

  return useMemo(
    () => ({
      status,
      commanderReady: Boolean(status.ready),
    }),
    [status]
  );
}
