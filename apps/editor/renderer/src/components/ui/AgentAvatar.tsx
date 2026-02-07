import React, { useMemo } from 'react';
import { getAvatarUrl, resolveAvatarId } from '../../utils/agentAvatar';

const wrapClass = (className) => (className ? ` ${className}` : '');

/**
 * AgentAvatar Component
 * 
 * @param {Object} props
 * @param {string|Object} props.avatarId - Specific avatar ID string OR a data object (cell/session) to resolve from
 * @param {string} props.seed - Seed for deterministic random avatar if avatarId is missing
 * @param {number} props.size - Size in pixels
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.offline - Whether to show the offline/grayscale state
 */
export function AgentAvatar({
  avatarId,
  seed,
  size = 20,
  className = '',
  offline = false,
}: any) {
  const resolved = useMemo(() => {
    if (avatarId && typeof avatarId === 'object') {
      return resolveAvatarId(avatarId);
    }
    return resolveAvatarId({ avatar: avatarId, id: seed, name: seed });
  }, [avatarId, seed]);
  
  // Use the pre-resolved URLs from the package metadata
  const avatarUrl = useMemo(() => getAvatarUrl(resolved), [resolved]);

  const containerClasses = [
    'flex items-center justify-center overflow-hidden',
    offline ? 'grayscale opacity-60 contrast-75' : '',
    wrapClass(className)
  ].join(' ');

  return (
    <div
      className={containerClasses}
      style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={resolved}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          draggable={false}
        />
      ) : null}
    </div>
  );
}
