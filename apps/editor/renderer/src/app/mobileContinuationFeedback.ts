const DIRECT_MODE = 'direct';
const HUB_MODE = 'hub';
const PROXY_MODE = 'proxy';

export const normalizeMobileContinuationMode = (value: any): 'direct' | 'hub' | 'proxy' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === HUB_MODE) {
    return HUB_MODE;
  }
  if (normalized === PROXY_MODE) {
    return PROXY_MODE;
  }
  return DIRECT_MODE;
};

export const resolveMobileContinuationErrorTitle = (mode: any) => {
  const normalized = normalizeMobileContinuationMode(mode);
  if (normalized === HUB_MODE) {
    return 'Mobile Hub failed';
  }
  if (normalized === PROXY_MODE) {
    return 'Mobile Proxy failed';
  }
  return 'Continue on Mobile failed';
};

export function buildMobileContinuationFeedback({
  requestedMode,
  sessionId,
  result,
}: {
  requestedMode?: string;
  sessionId?: string;
  result: any;
}) {
  const mode = normalizeMobileContinuationMode(result?.mode || requestedMode);
  const isHubMode = mode === HUB_MODE;
  const isProxyMode = mode === PROXY_MODE;
  const sessionLabel = result?.sessionName || sessionId || 'Session';

  if (isProxyMode) {
    const proxy = result?.proxy || {};
    const endpointLabel =
      proxy.host && proxy.port ? `${proxy.host}:${proxy.port}` : 'Proxy endpoint unavailable';
    const tokenLabel = proxy.tokenMasked || 'token issued';
    if (proxy.ready) {
      return {
        kind: 'success' as const,
        title: 'Mobile proxy command copied',
        description: `${sessionLabel} -> ${endpointLabel} (${tokenLabel})`,
      };
    }

    const warningLines = Array.isArray(proxy.warnings)
      ? proxy.warnings.filter(Boolean).map((line: string) => `- ${line}`)
      : [];
    const detailBlocks = [
      `${sessionLabel} proxy continuation is not ready yet.`,
      warningLines.length ? `Detected issues:\n${warningLines.join('\n')}` : '',
      result?.command ? `Generated command:\n${result.command}` : '',
    ].filter(Boolean);

    return {
      kind: 'warning' as const,
      title: 'Mobile Proxy needs setup',
      description: detailBlocks.join('\n\n'),
    };
  }

  const ssh = result?.ssh || {};
  const endpointLabel =
    ssh.user && ssh.host && ssh.port ? `${ssh.user}@${ssh.host}:${ssh.port}` : 'SSH endpoint unavailable';
  const hubLabel = result?.hub?.tmuxSession ? `Hub ${result.hub.tmuxSession}` : 'Mobile Hub';

  if (ssh.ready) {
    const autoEnabledNote = ssh.autoEnabled ? ' (SSH channel auto-enabled)' : '';
    return {
      kind: 'success' as const,
      title: isHubMode ? 'Mobile hub command copied' : 'Mobile command copied',
      description: isHubMode
        ? `${hubLabel} via ${endpointLabel}${autoEnabledNote}`
        : `${sessionLabel} -> ${endpointLabel}${autoEnabledNote}`,
    };
  }

  const warningLines = Array.isArray(ssh.warnings)
    ? ssh.warnings.filter(Boolean).map((line: string) => `- ${line}`)
    : [];
  const detailBlocks = [
    isHubMode
      ? `${hubLabel} is not ready for remote attach yet.`
      : `${sessionLabel} is not ready for remote attach yet.`,
    warningLines.length ? `Detected issues:\n${warningLines.join('\n')}` : '',
    isHubMode && result?.hub?.catalogSummary
      ? `Hub catalog:\nprojects ${result.hub.catalogSummary.projects}, cells ${result.hub.catalogSummary.cells}, sessions ${result.hub.catalogSummary.sessions}`
      : '',
    ssh.manualEnableCommand ? `Manual setup:\n${ssh.manualEnableCommand}` : '',
    result?.command ? `Generated command:\n${result.command}` : '',
  ].filter(Boolean);

  return {
    kind: 'warning' as const,
    title: isHubMode ? 'Mobile Hub needs setup' : 'Continue on Mobile needs setup',
    description: detailBlocks.join('\n\n'),
  };
}
