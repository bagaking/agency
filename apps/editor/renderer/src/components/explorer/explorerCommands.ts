import {
  ClipboardPaste,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  FolderPlus,
  Globe,
  Layers,
  Link,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
} from 'lucide-react';

export type ExplorerCommandSurface = 'header' | 'context_menu';

export type ExplorerCommandGroup =
  | 'workspace'
  | 'create'
  | 'mutate'
  | 'clipboard'
  | 'inspect'
  | 'workflow'
  | 'danger';

export type ExplorerCommandContext = {
  selectionTargets: string[];
  canPaste: boolean;
  hasResearchLane?: boolean;
  hiddenCommandIds?: string[];
  actions: Record<string, () => void>;
};

export type ExplorerCommandDescriptor = {
  id: string;
  label: string;
  icon: any;
  surface: ExplorerCommandSurface;
  group: ExplorerCommandGroup;
  shortcut?: string;
  when?: (context: ExplorerCommandContext) => boolean;
  disabled?: (context: ExplorerCommandContext) => boolean;
  run: (context: ExplorerCommandContext) => void;
  destructive?: boolean;
};

export const EXPLORER_COMMAND_REGISTRY: ExplorerCommandDescriptor[] = [
  {
    id: 'explorer.goToAgentCells',
    label: 'Go to Agent Cells',
    icon: Layers,
    surface: 'header',
    group: 'workspace',
    run: (context) => context.actions.onJumpToAgents?.(),
  },
  {
    id: 'explorer.newFile',
    label: 'New File',
    icon: FilePlus2,
    surface: 'header',
    group: 'create',
    run: (context) => context.actions.onNewFile?.(),
  },
  {
    id: 'explorer.newFolder',
    label: 'New Folder',
    icon: FolderPlus,
    surface: 'header',
    group: 'create',
    run: (context) => context.actions.onNewFolder?.(),
  },
  {
    id: 'explorer.refresh',
    label: 'Refresh',
    icon: RefreshCw,
    surface: 'header',
    group: 'workspace',
    run: (context) => context.actions.onRefresh?.(),
  },
  {
    id: 'explorer.researchLane',
    label: 'Open Research Lane',
    icon: Globe,
    surface: 'header',
    group: 'workspace',
    when: (context) => Boolean(context.hasResearchLane),
    run: (context) => context.actions.onToggleResearchLane?.(),
  },
  {
    id: 'explorer.context.newFile',
    label: 'New File',
    icon: FilePlus2,
    surface: 'context_menu',
    group: 'create',
    run: (context) => context.actions.onNewFile?.(),
  },
  {
    id: 'explorer.context.newFolder',
    label: 'New Folder',
    icon: FolderPlus,
    surface: 'context_menu',
    group: 'create',
    run: (context) => context.actions.onNewFolder?.(),
  },
  {
    id: 'explorer.context.rename',
    label: 'Rename',
    icon: Pencil,
    surface: 'context_menu',
    group: 'mutate',
    shortcut: 'F2',
    disabled: (context) => context.selectionTargets.length !== 1,
    run: (context) => context.actions.onRename?.(),
  },
  {
    id: 'explorer.context.duplicate',
    label: 'Duplicate',
    icon: Copy,
    surface: 'context_menu',
    group: 'mutate',
    disabled: (context) => context.selectionTargets.length !== 1,
    run: (context) => context.actions.onDuplicate?.(),
  },
  {
    id: 'explorer.context.copy',
    label: 'Copy',
    icon: Copy,
    surface: 'context_menu',
    group: 'clipboard',
    shortcut: 'CMD+C',
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onCopy?.(),
  },
  {
    id: 'explorer.context.copyRelativePath',
    label: 'Copy Relative Path',
    icon: Link,
    surface: 'context_menu',
    group: 'clipboard',
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onCopyRelativePath?.(),
  },
  {
    id: 'explorer.context.copyAbsolutePath',
    label: 'Copy Absolute Path',
    icon: Link,
    surface: 'context_menu',
    group: 'clipboard',
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onCopyAbsolutePath?.(),
  },
  {
    id: 'explorer.context.cut',
    label: 'Cut',
    icon: Scissors,
    surface: 'context_menu',
    group: 'clipboard',
    shortcut: 'CMD+X',
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onCut?.(),
  },
  {
    id: 'explorer.context.paste',
    label: 'Paste',
    icon: ClipboardPaste,
    surface: 'context_menu',
    group: 'clipboard',
    shortcut: 'CMD+V',
    disabled: (context) => !context.canPaste,
    run: (context) => context.actions.onPaste?.(),
  },
  {
    id: 'explorer.context.pasteMarkdown',
    label: 'Paste as Markdown',
    icon: FileText,
    surface: 'context_menu',
    group: 'clipboard',
    run: (context) => context.actions.onPasteMarkdown?.(),
  },
  {
    id: 'explorer.context.reveal',
    label: 'Reveal',
    icon: Eye,
    surface: 'context_menu',
    group: 'inspect',
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onReveal?.(),
  },
  {
    id: 'explorer.context.addComment',
    label: 'Add Comment',
    icon: MessageSquarePlus,
    surface: 'context_menu',
    group: 'workflow',
    disabled: (context) => context.selectionTargets.length !== 1,
    run: (context) => context.actions.onAddComment?.(),
  },
  {
    id: 'explorer.context.delete',
    label: 'Delete',
    icon: Trash2,
    surface: 'context_menu',
    group: 'danger',
    shortcut: 'DEL',
    destructive: true,
    disabled: (context) => context.selectionTargets.length === 0,
    run: (context) => context.actions.onDelete?.(),
  },
];

export const getExplorerCommandsForSurface = (
  surface: ExplorerCommandSurface,
  context: ExplorerCommandContext
) =>
  EXPLORER_COMMAND_REGISTRY.filter((command) => {
    const hiddenCommandIds = Array.isArray(context.hiddenCommandIds)
      ? context.hiddenCommandIds
      : [];
    if (command.surface !== surface) {
      return false;
    }
    if (hiddenCommandIds.includes(command.id)) {
      return false;
    }
    if (typeof command.when === 'function' && !command.when(context)) {
      return false;
    }
    return true;
  }).map((command) => ({
    ...command,
    isDisabled: typeof command.disabled === 'function' ? command.disabled(context) : false,
    onSelect: () => command.run(context),
  }));

export const EXPLORER_CONTEXT_MENU_GROUP_ORDER: ExplorerCommandGroup[] = [
  'create',
  'mutate',
  'clipboard',
  'inspect',
  'workflow',
  'danger',
];
