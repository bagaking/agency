type DataTransferLike =
  | {
      files?: ArrayLike<any> | null;
      items?: ArrayLike<any> | null;
      types?: ArrayLike<string> | null;
      getData?: ((type: string) => string) | null;
    }
  | null
  | undefined;

const URI_LIST_MIME = 'text/uri-list';
const DOWNLOAD_URL_MIME = 'DownloadURL';
const TEXT_PLAIN_MIME = 'text/plain';

const normalizeDroppedPath = (value: string): string => String(value || '').trim();

const decodeFileUri = (rawValue: string): string => {
  const value = String(rawValue || '').trim();
  if (!value.toLowerCase().startsWith('file://')) {
    return '';
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'file:') {
      return '';
    }
    let pathname = decodeURIComponent(url.pathname || '');
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname;
  } catch {
    return '';
  }
};

const parseUriList = (value: string): string[] => {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'));

  return lines.map((line) => decodeFileUri(line)).filter(Boolean);
};

const parseDownloadUrl = (value: string): string[] => {
  const text = String(value || '').trim();
  if (!text) {
    return [];
  }
  const firstColon = text.indexOf(':');
  const secondColon = firstColon >= 0 ? text.indexOf(':', firstColon + 1) : -1;
  if (firstColon < 0 || secondColon < 0) {
    return [];
  }
  const urlPart = text.slice(secondColon + 1).trim();
  const filePath = decodeFileUri(urlPart);
  return filePath ? [filePath] : [];
};

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;

const parsePlainTextPaths = (value: string): string[] =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (line.toLowerCase().startsWith('file://')) {
        const decoded = decodeFileUri(line);
        return decoded ? [decoded] : [];
      }
      if (line.startsWith('/') || WINDOWS_ABSOLUTE_PATH_PATTERN.test(line)) {
        return [line];
      }
      return [];
    });

const readPathFromDroppedFile = ({
  file,
  getPathForDroppedFile,
}: {
  file: any;
  getPathForDroppedFile?: ((file: any) => string) | null | undefined;
}): string => {
  const fromLegacyFilePath = normalizeDroppedPath(file?.path || '');
  if (fromLegacyFilePath) {
    return fromLegacyFilePath;
  }
  if (typeof getPathForDroppedFile !== 'function') {
    return '';
  }
  const fromBridge = normalizeDroppedPath(getPathForDroppedFile(file) || '');
  return fromBridge;
};

export const hasExternalDropEntries = (dataTransfer: DataTransferLike): boolean => {
  if (!dataTransfer) {
    return false;
  }
  if (dataTransfer.files && dataTransfer.files.length) {
    return true;
  }

  const items = Array.from(dataTransfer.items || []);
  if (items.some((item: any) => item?.kind === 'file')) {
    return true;
  }

  const types = Array.from(dataTransfer.types || []);
  return (
    types.includes(URI_LIST_MIME) ||
    types.includes(DOWNLOAD_URL_MIME) ||
    types.includes(TEXT_PLAIN_MIME)
  );
};

export const readExternalDropPaths = (
  dataTransfer: DataTransferLike,
  {
    getPathForDroppedFile,
  }: {
    getPathForDroppedFile?: ((file: any) => string) | null | undefined;
  } = {}
): string[] => {
  if (!dataTransfer) {
    return [];
  }

  const fromFiles = Array.from(dataTransfer.files || [])
    .map((file: any) => readPathFromDroppedFile({ file, getPathForDroppedFile }))
    .filter(Boolean);

  const fromItems = Array.from(dataTransfer.items || [])
    .filter((item: any) => item?.kind === 'file')
    .map((item: any) => item?.getAsFile?.())
    .map((file: any) => readPathFromDroppedFile({ file, getPathForDroppedFile }))
    .filter(Boolean);

  const getData = dataTransfer.getData || (() => '');
  const fromUriList = parseUriList(getData(URI_LIST_MIME) || '');
  const fromDownloadUrl = parseDownloadUrl(getData(DOWNLOAD_URL_MIME) || '');
  const fromPlainText = parsePlainTextPaths(getData(TEXT_PLAIN_MIME) || '');

  return Array.from(
    new Set([
      ...fromFiles,
      ...fromItems,
      ...fromUriList,
      ...fromDownloadUrl,
      ...fromPlainText,
    ])
  );
};

export const __testExternalDropPaths = {
  decodeFileUri,
  parseDownloadUrl,
  parsePlainTextPaths,
  parseUriList,
  readPathFromDroppedFile,
};

