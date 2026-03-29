import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { focusRing } from '../ui/focusRing';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { EXPLORER_CONTEXT_MENU_GROUP_ORDER } from './explorerCommands';

const focusRingClass = focusRing.default;

export function ExplorerContextMenu({
  x,
  y,
  onClose,
  selectionCount,
  commands,
}: any) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleCommands = Array.isArray(commands) ? commands : [];
  const groupedCommands = EXPLORER_CONTEXT_MENU_GROUP_ORDER.map((group) => ({
    group,
    commands: visibleCommands.filter((command) => command.group === group),
  })).filter((entry) => entry.commands.length > 0);
  const flatCommands = groupedCommands.flatMap((entry) => entry.commands);

  const focusEnabledItem = (startIndex: number, direction: 1 | -1 = 1) => {
    const items = itemRefs.current;
    if (!items.length) {
      return;
    }
    const count = items.length;
    for (let offset = 0; offset < count; offset += 1) {
      const index = (startIndex + offset * direction + count) % count;
      const item = items[index];
      if (item && !item.disabled) {
        item.focus();
        return;
      }
    }
  };

  useDismissibleLayer({
    open: true,
      onDismiss: () => onClose?.(),
    refs: [menuRef],
  });

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menu;

    let nextX = x;
    let nextY = y;

    // Smart anti-collision
    if (x + offsetWidth > innerWidth) {
      nextX = innerWidth - offsetWidth - 12;
    }
    if (y + offsetHeight > innerHeight) {
      nextY = innerHeight - offsetHeight - 12;
    }

    menu.style.left = `${nextX}px`;
    menu.style.top = `${nextY}px`;
    menu.style.visibility = 'visible';

    const frameId = window.requestAnimationFrame(() => {
      focusEnabledItem(0, 1);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [x, y]);

    return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 rounded-2xl border border-white/10 bg-[#1a1d23]/95 py-2 text-[11px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl animate-tab-in ring-1 ring-white/5 select-none"
      style={{ visibility: 'hidden' }}
      role="menu"
      aria-label="Explorer actions"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(event) => {
        const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
        if (!items.length) {
          return;
        }
        const currentIndex = items.findIndex((item) => item === document.activeElement);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          focusEnabledItem(currentIndex >= 0 ? currentIndex + 1 : 0, 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          focusEnabledItem(currentIndex >= 0 ? currentIndex - 1 : items.length - 1, -1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          focusEnabledItem(0, 1);
        } else if (event.key === 'End') {
          event.preventDefault();
          focusEnabledItem(items.length - 1, -1);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onClose?.();
        }
      }}
    >
      <div className="px-4 pb-2 mb-1 border-b border-white/5">
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/30">Explorer Actions</div>
      </div>

      <div className="px-1.5">
        {groupedCommands.map((groupEntry, groupIndex) => (
          <div key={groupEntry.group} className="space-y-0.5">
            {groupIndex > 0 ? <div className="h-px bg-white/5 my-1.5 mx-2" /> : null}
            {groupEntry.commands.map((command) => {
              const flatIndex = flatCommands.findIndex((item) => item.id === command.id);
              const label =
                command.id === 'explorer.context.delete' && selectionCount > 1
                  ? `Delete ${selectionCount} Items`
                  : command.label;
              return (
                <ContextMenuItem
                  key={command.id}
                  itemRef={(node) => (itemRefs.current[flatIndex] = node)}
                  icon={command.icon}
                  label={label}
                  shortcut={normalizeShortcut(command.shortcut)}
                  onClick={() => {
                    command.onSelect?.();
                    onClose?.();
                  }}
                  disabled={command.isDisabled}
                  variant={command.destructive ? 'destructive' : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

function normalizeShortcut(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  return value.replace(/CMD/g, '⌘').replace(/DEL/g, '⌫');
}

function ContextMenuItem({ itemRef, icon: Icon, label, onClick, disabled, variant, shortcut }: any) {
  return (
    <button
      ref={itemRef}
      type="button"
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      className={`group flex w-full items-center justify-between rounded-lg px-3 py-1.5 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${focusRingClass} ${
        variant === 'destructive'
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-muted-foreground/85 hover:bg-primary/10 hover:text-primary'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon
          size={13}
          strokeWidth={2}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-500 ${!disabled && 'group-hover:scale-125 group-hover:translate-x-0.5'}`}
        />
        <span className="truncate font-semibold tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {shortcut && (
          <span aria-hidden="true" className="text-[9px] font-black opacity-20 group-hover:opacity-40 transition-opacity uppercase tracking-widest font-mono">
            {shortcut}
          </span>
        )}
        {!disabled && (
          <ChevronRight
            size={10}
            aria-hidden="true"
            className="opacity-0 group-hover:opacity-40 translate-x-1 group-hover:translate-x-0 transition-all"
          />
        )}
      </div>
    </button>
  );
}
