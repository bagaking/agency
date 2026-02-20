const DIRECT_MODE = 'direct';
const HUB_MODE = 'hub';

export const normalizeMobileContinuationMode = (value: any): 'direct' | 'hub' =>
  String(value || '').trim().toLowerCase() === HUB_MODE ? HUB_MODE : DIRECT_MODE;

export const resolveMobileContinuationErrorTitle = (mode: any) =>
  normalizeMobileContinuationMode(mode) === HUB_MODE
    ? 'Mobile Hub failed'
    : 'Continue on Mobile failed';

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
  const ssh = result?.ssh || {};
  const sessionLabel = result?.sessionName || sessionId || 'Session';
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

