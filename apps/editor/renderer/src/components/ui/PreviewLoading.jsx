import React, { useId } from 'react';

export function PreviewLoading({ className = '' }) {
  const uid = useId().replace(/:/g, '');
  const gridId = `preview-grid-${uid}`;
  const scanId = `preview-scan-${uid}`;
  const glowId = `preview-glow-${uid}`;

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox="0 0 320 200"
        preserveAspectRatio="none"
        role="img"
        aria-label="Loading preview"
      >
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M16 0H0V16"
              fill="none"
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth="0.6"
            />
          </pattern>
          <linearGradient id={scanId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.45)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(148, 163, 184, 0.2)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.8)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="rgba(5, 7, 12, 0.85)" />
        <rect width="100%" height="100%" fill={`url(#${gridId})`} opacity="0.6" />
        <rect width="100%" height="100%" fill={`url(#${glowId})`} opacity="0.6" />
        <rect width="100%" height="24" fill={`url(#${scanId})`}>
          <animate attributeName="y" from="-24" to="200" dur="1.6s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  );
}
