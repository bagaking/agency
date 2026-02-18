import React from 'react';

import { IconButton } from '../../ui/IconButton';

export function HilMemoRowAction({
  icon: Icon,
  onClick,
  title,
  color = 'hover:text-foreground hover:bg-muted/10',
}: any) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <IconButton
      label={title}
      onClick={handleClick}
      className={`p-1.5 rounded-lg transition-colors text-muted-foreground/40 ${color}`}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
    </IconButton>
  );
}
