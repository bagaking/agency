import {
  findTerminalPathMatches,
  stripTrailingPathPunctuation,
} from '../../utils/terminalSelection';

type TerminalPathLinkTarget = {
  path: string;
  rootPath: string;
  line: number | null;
  column: number | null;
};

type WorkbenchFileOpenPayload = {
  path: string;
  rootPath: string;
  line: number | null;
  column: number | null;
  focusView: boolean;
  cellId: string;
};

const resolveTerminalPathLinkTarget = ({
  rawText,
  worktreePath,
}: {
  rawText: string;
  worktreePath: string;
}): TerminalPathLinkTarget | null => {
  const cleaned = stripTrailingPathPunctuation(rawText || '');
  if (!cleaned) {
    return null;
  }

  const match = /^(.*?)(?::(\d+)(?::(\d+)?)?)?$/.exec(cleaned);
  if (!match) {
    return null;
  }

  let targetPath = match[1] || '';
  const line = match[2] ? Number(match[2]) : null;
  const column = match[3] ? Number(match[3]) : null;
  if (!targetPath) {
    return null;
  }

  targetPath = targetPath.replace(/\\/g, '/');
  if (targetPath.startsWith('./')) {
    targetPath = targetPath.slice(2);
  }

  const normalizedRoot = worktreePath
    ? String(worktreePath).replace(/\\/g, '/').replace(/\/+$/, '')
    : '';
  if (targetPath.startsWith('/')) {
    if (!normalizedRoot || !targetPath.startsWith(`${normalizedRoot}/`)) {
      return null;
    }
    targetPath = targetPath.slice(normalizedRoot.length + 1);
  }

  return {
    path: targetPath,
    rootPath: normalizedRoot || worktreePath,
    line: Number.isFinite(line) ? line : null,
    column: Number.isFinite(column) ? column : null,
  };
};

const resolveBufferColumn = ({ columnMap, index }: { columnMap: number[]; index: number }) => {
  if (!columnMap.length) {
    return index;
  }
  const clamped = Math.max(0, Math.min(index, columnMap.length - 1));
  const column = columnMap[clamped];
  return Number.isFinite(column) ? column : index;
};

const buildLinkRange = ({
  bufferLineNumber,
  match,
  columnMap,
}: {
  bufferLineNumber: number;
  match: { text: string; startIndex: number };
  columnMap: number[];
}) => {
  const length = match.text.length;
  const startCol = resolveBufferColumn({ columnMap, index: match.startIndex });
  if (length <= 0) {
    return {
      start: { x: startCol + 1, y: bufferLineNumber },
      end: { x: startCol + 1, y: bufferLineNumber },
    };
  }

  const endColRaw = resolveBufferColumn({
    columnMap,
    index: match.startIndex + length,
  });
  const endCol = Math.max(startCol, endColRaw - 1);
  return {
    start: { x: startCol + 1, y: bufferLineNumber },
    end: { x: endCol + 1, y: bufferLineNumber },
  };
};

const shouldActivateTerminalLink = (event: MouseEvent) => {
  const isMac = navigator.platform?.toLowerCase().includes('mac');
  return isMac ? Boolean(event.metaKey) : Boolean(event.ctrlKey);
};

export const registerTerminalPathLinkProvider = ({
  terminal,
  cellId,
  worktreePath,
  onOpenWorkbenchFile,
}: {
  terminal: any;
  cellId: string;
  worktreePath: string;
  onOpenWorkbenchFile?: (payload: WorkbenchFileOpenPayload) => void;
}) => {
  if (!terminal?.registerLinkProvider) {
    return null;
  }

  const handleLinkActivate = (rawText: string, event: MouseEvent) => {
    if (!shouldActivateTerminalLink(event)) {
      return;
    }

    const resolved = resolveTerminalPathLinkTarget({ rawText, worktreePath });
    if (!resolved?.path) {
      return;
    }

    onOpenWorkbenchFile?.({
      path: resolved.path,
      rootPath: resolved.rootPath,
      line: resolved.line,
      column: resolved.column,
      focusView: true,
      cellId,
    });
  };

  return terminal.registerLinkProvider({
    provideLinks: (bufferLineNumber: number, callback: (links?: any[]) => void) => {
      const buffer = terminal?.buffer?.active;
      const line = buffer?.getLine(bufferLineNumber);
      const columnMap: number[] = [];
      const text = line ? line.translateToString(true, undefined, undefined, columnMap) : '';
      if (!text) {
        callback(undefined);
        return;
      }

      const matches = findTerminalPathMatches(text);
      if (!matches.length) {
        callback(undefined);
        return;
      }

      const links = matches.map((match) => ({
        text: match.text,
        range: buildLinkRange({ bufferLineNumber, match, columnMap }),
        activate: (event: MouseEvent) => handleLinkActivate(match.text, event),
      }));

      callback(links);
    },
  });
};

