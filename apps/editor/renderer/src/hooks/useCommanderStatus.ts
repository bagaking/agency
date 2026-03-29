import { useEffect, useMemo, useState } from 'react';

import { COMMANDER_ACTION_IDS } from '../../../shared/commanderCore';
import { getCommanderStatus, isAgencyAvailable } from '../services/agencyBridge';

const EMPTY_STATUS: {
  ready: boolean;
  configured: boolean;
  commandAvailable: boolean;
  connected: boolean;
  reason: string;
  missingRequired: string[];
  checkedAt: string;
  actions: Record<string, { visible: boolean; enabled: boolean; reason: string; checkedAt: string; mode?: string }>;
} = Object.freeze({
  ready: false,
  configured: false,
  commandAvailable: false,
  connected: false,
  reason: '',
  missingRequired: [],
  checkedAt: '',
  actions: {
    [COMMANDER_ACTION_IDS.smartFork]: {
      visible: false,
      enabled: false,
      reason: '',
      checkedAt: '',
      mode: '',
    },
    [COMMANDER_ACTION_IDS.smartName]: {
      visible: false,
      enabled: false,
      reason: '',
      checkedAt: '',
      mode: '',
    },
  },
});

export function useCommanderStatus({
  worktreePath = '',
  cellId = '',
  cellName = '',
  cellBranch = '',
  sessionId = '',
  refreshKey = '',
} = {}) {
  const [status, setStatus] = useState(EMPTY_STATUS);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async (forceRefresh = false) => {
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
          cellId,
          cellName,
          cellBranch,
          sessionId,
          forceRefresh,
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

    void loadStatus(true);
    return () => {
      cancelled = true;
    };
  }, [cellBranch, cellId, cellName, refreshKey, sessionId, worktreePath]);

  return useMemo(
    () => ({
      status,
      commanderReady: Boolean(status.ready),
      actionAvailability: status.actions || EMPTY_STATUS.actions,
      smartForkAvailable: Boolean(
        status.actions?.[COMMANDER_ACTION_IDS.smartFork]?.visible
      ),
      smartNameAvailable: Boolean(
        status.actions?.[COMMANDER_ACTION_IDS.smartName]?.visible
      ),
    }),
    [status]
  );
}
