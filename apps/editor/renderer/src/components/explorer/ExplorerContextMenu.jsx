import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FilePlus2, 
  FolderPlus, 
  Pencil, 
  Copy, 
  Scissors, 
  ClipboardPaste, 
  FileText, 
  Eye, 
  Trash2, 
  ChevronRight,
  MessageSquarePlus,
  Link
} from 'lucide-react';

export function ExplorerContextMenu({
  x,
  y,
  onClose,
  selectionTargets,
  canPaste,
  onNewFile,
  onNewFolder,
  onRename,
  onDuplicate,
  onCopy,
  onCopyRelativePath,
  onCopyAbsolutePath,
  onCut,
  onPaste,
  onPasteMarkdown,
  onReveal,
  onDelete,
  onAddComment,
}) {
  const menuRef = useRef(null);
  const wrapAction = (action) => () => {
    action?.();
    onClose?.();
  };

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
  }, [x, y]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const menu = menuRef.current;
      if (!menu) return;
      if (menu.contains(event.target)) return;
      onClose();
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 rounded-2xl border border-white/10 bg-[#1a1d23]/95 py-2 text-[11px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl animate-tab-in ring-1 ring-white/5 select-none"
      style={{ visibility: 'hidden' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 pb-2 mb-1 border-b border-white/5">
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/30">Object System</div>
      </div>

      <div className="px-1.5 space-y-0.5">
        <ContextMenuItem icon={FilePlus2} label="New File" onClick={wrapAction(onNewFile)} />
        <ContextMenuItem icon={FolderPlus} label="New Folder" onClick={wrapAction(onNewFolder)} />

        <div className="h-px bg-white/5 my-1.5 mx-2" />

        <ContextMenuItem
          icon={Pencil}
          label="Rename"
          shortcut="F2"
          onClick={wrapAction(onRename)}
          disabled={selectionTargets.length !== 1}
        />
        <ContextMenuItem 
          icon={Copy} 
          label="Duplicate" 
          onClick={wrapAction(onDuplicate)} 
          disabled={selectionTargets.length !== 1} 
        />

        <div className="h-px bg-white/5 my-1.5 mx-2" />

        <ContextMenuItem 
          icon={Copy} 
          label="Copy" 
          shortcut="⌘C" 
          onClick={wrapAction(onCopy)} 
          disabled={!selectionTargets.length} 
        />
        <ContextMenuItem 
          icon={Link} 
          label="Copy Relative Path" 
          onClick={wrapAction(onCopyRelativePath)} 
          disabled={!selectionTargets.length} 
        />
        <ContextMenuItem 
          icon={Link} 
          label="Copy Absolute Path" 
          onClick={wrapAction(onCopyAbsolutePath)} 
          disabled={!selectionTargets.length} 
        />
        <ContextMenuItem 
          icon={Scissors} 
          label="Cut" 
          shortcut="⌘X" 
          onClick={wrapAction(onCut)} 
          disabled={!selectionTargets.length} 
        />
        <ContextMenuItem 
          icon={ClipboardPaste} 
          label="Paste" 
          shortcut="⌘V" 
          onClick={wrapAction(onPaste)} 
          disabled={!canPaste} 
        />
        <ContextMenuItem 
          icon={FileText} 
          label="Paste as MD" 
          onClick={wrapAction(onPasteMarkdown)} 
        />

        <div className="h-px bg-white/5 my-1.5 mx-2" />

        <ContextMenuItem 
          icon={Eye} 
          label="Reveal" 
          onClick={wrapAction(onReveal)} 
          disabled={!selectionTargets.length} 
        />
        <ContextMenuItem
            icon={MessageSquarePlus}
            label="Add Comment"
            onClick={wrapAction(onAddComment)}
            disabled={selectionTargets.length !== 1}
        />
        <ContextMenuItem
          icon={Trash2}
          label={selectionTargets.length > 1 ? `Delete ${selectionTargets.length} Items` : 'Delete Object'}
          shortcut="⌫"
          onClick={wrapAction(onDelete)}
          disabled={!selectionTargets.length}
          variant="destructive"
        />
      </div>
    </div>,
    document.body
  );
}

function ContextMenuItem({ icon: Icon, label, onClick, disabled, variant, shortcut }) {
  return (
    <button
      type="button"
      className={`group flex w-full items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed ${
        variant === 'destructive'
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-muted-foreground/80 hover:bg-primary/10 hover:text-primary'
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
          className={`shrink-0 transition-transform duration-500 ${!disabled && 'group-hover:scale-125 group-hover:translate-x-0.5'}`}
        />
        <span className="truncate font-semibold tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {shortcut && (
          <span className="text-[9px] font-black opacity-20 group-hover:opacity-40 transition-opacity uppercase tracking-widest font-mono">
            {shortcut}
          </span>
        )}
        {!disabled && (
          <ChevronRight
            size={10}
            className="opacity-0 group-hover:opacity-40 translate-x-1 group-hover:translate-x-0 transition-all"
          />
        )}
      </div>
    </button>
  );
}
