import React, { useMemo } from 'react';
import { AgentAvatar } from './AgentAvatar.jsx';
import { resolveIdleRingStyle } from '../../utils/idleRing';

const wrapClass = (className) => (className ? ` ${className}` : '');

const resolveIdleMs = (idleMs, lastActivityAt) => {
  if (Number.isFinite(idleMs)) {
    return idleMs;
  }
  if (!lastActivityAt) {
    return null;
  }
  const parsed = Date.parse(lastActivityAt);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Date.now() - parsed);
};

/**
 * AgentAvatarBadge Component
 *
 * @param {Object} props
 * @param {string|Object} props.avatarId
 * @param {number} props.size
 * @param {number} props.ringSize
 * @param {number} props.idleMs
 * @param {string|number} props.lastActivityAt
 * @param {boolean} props.isClosed
 * @param {boolean} props.showRing
 * @param {string} props.className
 * @param {string} props.ringClassName
 * @param {string} props.avatarClassName
 */
export function AgentAvatarBadge({
  avatarId,
  size = 20,
  ringSize,
  idleMs,
  lastActivityAt,
  isClosed = false,
  showRing = true,
  className = '',
  ringClassName = '',
  avatarClassName = '',
}) {
  const resolvedIdleMs = useMemo(
    () => resolveIdleMs(idleMs, lastActivityAt),
    [idleMs, lastActivityAt]
  );
  const resolvedRingSize = Number.isFinite(ringSize) ? ringSize : size + (showRing ? 6 : 0);

  if (!showRing) {
    return (
      <AgentAvatar
        avatarId={avatarId}
        size={size}
        offline={isClosed}
        className={avatarClassName || className}
      />
    );
  }

  const ringStyle = resolveIdleRingStyle({ idleMs: resolvedIdleMs, isClosed });
  const containerClasses = [
    'flex items-center justify-center rounded-full border-2',
    ringClassName,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      style={{ width: resolvedRingSize, height: resolvedRingSize, ...ringStyle }}
    >
      <AgentAvatar
        avatarId={avatarId}
        size={size}
        offline={isClosed}
        className={wrapClass(avatarClassName || '')}
      />
    </div>
  );
}
