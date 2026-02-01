import React from 'react';

export const AVATAR_IDS = ['fox', 'cat', 'owl', 'robot', 'frog', 'panda', 'whale', 'bear'];

const hashString = (input) => {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const resolveAvatarId = (input = {}) => {
  const safeInput = input && typeof input === 'object' ? input : {};
  const { avatar, id, name } = safeInput;
  const explicit = String(avatar || '').trim();
  if (explicit && AVATAR_IDS.includes(explicit)) {
    return explicit;
  }
  const seed = String(id || name || explicit || '');
  if (!seed) {
    return AVATAR_IDS[0];
  }
  return AVATAR_IDS[hashString(seed) % AVATAR_IDS.length];
};

const wrapClass = (className) => (className ? ` ${className}` : '');

const Eye = ({ cx }) => <circle cx={cx} cy="12" r="1.4" fill="#0f172a" />;

export function AgentAvatar({
  avatarId,
  seed,
  size = 20,
  className = '',
  animated = false,
}) {
  const resolved = resolveAvatarId({ avatar: avatarId, id: seed, name: seed });
  const classes = `${animated ? 'animate-pulse ' : ''}motion-reduce:animate-none`;
  const svgProps = {
    viewBox: '0 0 24 24',
    className: `${classes}${wrapClass(className)}`,
    style: { width: size, height: size },
  };

  switch (resolved) {
    case 'cat':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12.5" r="9" fill="#fbbf24" />
          <path d="M5 9l2-3 3 3z" fill="#f59e0b" />
          <path d="M19 9l-2-3-3 3z" fill="#f59e0b" />
          <Eye cx="9" />
          <Eye cx="15" />
          <path d="M9 16c2 1.8 4 1.8 6 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="6.5" r="1" fill="#fff" opacity="0.7" />
        </svg>
      );
    case 'owl':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12.5" r="9" fill="#a855f7" />
          <circle cx="8.8" cy="12" r="2.4" fill="#f8fafc" />
          <circle cx="15.2" cy="12" r="2.4" fill="#f8fafc" />
          <circle cx="8.8" cy="12" r="1.2" fill="#0f172a" />
          <circle cx="15.2" cy="12" r="1.2" fill="#0f172a" />
          <path d="M12 14.5l-1.2 2h2.4z" fill="#f59e0b" />
        </svg>
      );
    case 'robot':
      return (
        <svg {...svgProps}>
          <rect x="5" y="6" width="14" height="14" rx="3" fill="#38bdf8" />
          <circle cx="9" cy="12" r="1.6" fill="#0f172a" />
          <circle cx="15" cy="12" r="1.6" fill="#0f172a" />
          <rect x="9" y="15.5" width="6" height="1.6" rx="0.8" fill="#0f172a" />
          <rect x="11" y="3.5" width="2" height="2.8" rx="1" fill="#94a3b8" />
        </svg>
      );
    case 'frog':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="13" r="8.5" fill="#22c55e" />
          <circle cx="8" cy="7.5" r="2.5" fill="#f8fafc" />
          <circle cx="16" cy="7.5" r="2.5" fill="#f8fafc" />
          <circle cx="8" cy="7.5" r="1.2" fill="#0f172a" />
          <circle cx="16" cy="7.5" r="1.2" fill="#0f172a" />
          <path d="M8.5 16.5c2.2 1.6 4.8 1.6 7 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'panda':
      return (
        <svg {...svgProps}>
          <circle cx="7" cy="7" r="3" fill="#0f172a" />
          <circle cx="17" cy="7" r="3" fill="#0f172a" />
          <circle cx="12" cy="12.5" r="8.5" fill="#f8fafc" />
          <circle cx="9" cy="12" r="2.2" fill="#0f172a" />
          <circle cx="15" cy="12" r="2.2" fill="#0f172a" />
          <circle cx="9" cy="12" r="1" fill="#f8fafc" />
          <circle cx="15" cy="12" r="1" fill="#f8fafc" />
          <path d="M10 16c1.4 1.2 2.6 1.2 4 0" stroke="#0f172a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'whale':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="13" r="8.5" fill="#0ea5e9" />
          <circle cx="9.5" cy="12" r="1.4" fill="#0f172a" />
          <path d="M14 16c1.6 0.8 3 0.8 4.2 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M6.5 10c-1.6 1.2-2.2 2.4-2.4 4" stroke="#0f172a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="13.5" cy="6.5" r="1.1" fill="#e0f2fe" />
        </svg>
      );
    case 'bear':
      return (
        <svg {...svgProps}>
          <circle cx="7" cy="7.5" r="2.6" fill="#a16207" />
          <circle cx="17" cy="7.5" r="2.6" fill="#a16207" />
          <circle cx="12" cy="12.5" r="8.5" fill="#f59e0b" />
          <circle cx="9.5" cy="12" r="1.3" fill="#0f172a" />
          <circle cx="14.5" cy="12" r="1.3" fill="#0f172a" />
          <path d="M10.5 16c1.4 1 2.6 1 4 0" stroke="#0f172a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12.5" r="9" fill="#f97316" />
          <path d="M5.5 9l2-3 3 3z" fill="#fdba74" />
          <path d="M18.5 9l-2-3-3 3z" fill="#fdba74" />
          <Eye cx="9" />
          <Eye cx="15" />
          <path d="M9 16c2 1.8 4 1.8 6 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="6.5" r="1" fill="#fff" opacity="0.7" />
        </svg>
      );
  }
}
