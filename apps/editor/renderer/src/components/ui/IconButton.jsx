import React from 'react';
import { Tooltip } from './Tooltip.jsx';
import { focusRing } from './focusRing.js';

export function IconButton({
  label,
  tooltip,
  side = 'top',
  focusRing: focusRingKey = 'default',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const tooltipLabel = tooltip === false ? '' : tooltip || label;
  const ringClass = focusRing[focusRingKey] || focusRing.default;
  const button = (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex items-center justify-center ${ringClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
  return (
    <Tooltip label={tooltipLabel} side={side}>
      {button}
    </Tooltip>
  );
}
