import React from 'react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { isCommanderTaskRun } from '../../../../shared/commanderCore';

export const COMMANDER_AVATAR_ID = 'AGENCY_BACKEND_COMMANDER';
export { isCommanderTaskRun };

export function SessionMapCommanderAvatar({
  busy = false,
  size = 48,
  ringSize,
  className = '',
}: any) {
  const resolvedRingSize = Number.isFinite(ringSize) ? ringSize : size + 6;
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ width: resolvedRingSize, height: resolvedRingSize }}
    >
      <div className="absolute inset-0 rounded-full bg-cyan-500/18 blur-2xl" />
      <AgentAvatarBadge
        avatarId={COMMANDER_AVATAR_ID}
        size={size}
        ringSize={resolvedRingSize}
        showRing={false}
        className="relative rounded-full bg-black/55 p-1"
      />
      {busy ? (
        <div
          data-commander-progress="true"
          className="absolute -bottom-2 left-1/2 h-2 w-[78%] -translate-x-1/2 overflow-hidden rounded-full border border-cyan-300/24 bg-[#081018]/95 px-[2px] py-[2px] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_4px_12px_rgba(0,0,0,0.22)]"
        >
          <div className="relative h-full w-full overflow-hidden rounded-full bg-cyan-400/12">
            <div className="animate-commander-progress-sweep absolute inset-y-0 left-[-35%] w-[42%] rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0),rgba(103,232,249,0.98),rgba(34,211,238,0))]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
