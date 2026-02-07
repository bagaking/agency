import React from 'react';
import { Tooltip } from './Tooltip';
import { focusRing } from './focusRing';

export function IconButton({
  label,
  tooltip,
  side = 'top',
  focusRing: focusRingKey = 'default',
  className = '',
  type = 'button',
  children,
  ...props
}: any) {
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
