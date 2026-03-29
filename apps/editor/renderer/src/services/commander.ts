import {
  COMMANDER_ACTION_IDS,
  type CommanderActionId,
} from '../../../shared/commanderCore';
import { performCommanderAction as invokePerformCommanderAction } from './agencyBridge';

type CommanderActionRequest = {
  actionId: CommanderActionId;
  clientRequestId?: string;
  worktreePath: string;
  cellId: string;
  cellName?: string;
  cellBranch?: string;
  sessionId: string;
  sessionName?: string;
  sourceSurface?: string;
  callerType?: string;
};

function unwrapCommanderResponse(response: any) {
  if (!response) {
    throw new Error('Commander service is unavailable.');
  }
  if (response.success === false) {
    const message =
      response?.failures?.[0]?.message || 'Commander action failed.';
    throw new Error(message);
  }
  return response?.data ?? null;
}

export async function performCommanderAction(
  payload: CommanderActionRequest
) {
  const response = await invokePerformCommanderAction(payload);
  return unwrapCommanderResponse(response);
}

export async function startCommanderSmartForkRun(
  payload: Omit<CommanderActionRequest, 'actionId'>
) {
  return performCommanderAction({
    ...payload,
    actionId: COMMANDER_ACTION_IDS.smartFork,
  });
}

export async function startCommanderSmartNameRun(
  payload: Omit<CommanderActionRequest, 'actionId'>
) {
  return performCommanderAction({
    ...payload,
    actionId: COMMANDER_ACTION_IDS.smartName,
  });
}
