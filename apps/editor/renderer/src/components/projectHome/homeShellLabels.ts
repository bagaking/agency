export function resolveHomeShellActionLabel(shellSummary: any): string {
  const visible = Boolean(shellSummary?.visible);
  const status = String(shellSummary?.status || '').trim().toLowerCase();
  if (visible) {
    return 'Close Home Shell';
  }
  if (status === 'ready') {
    return 'Home Shell Ready';
  }
  if (status === 'error') {
    return 'Retry Home Shell';
  }
  if (status === 'starting') {
    return 'Starting Home Shell';
  }
  if (status === 'exited') {
    return 'Restart Home Shell';
  }
  return 'Start Home Shell';
}

export function resolveHomeShellStatusLabel(shellSummary: any): string {
  const visible = Boolean(shellSummary?.visible);
  const status = String(shellSummary?.status || '').trim().toLowerCase();
  if (visible) {
    return 'Home shell running';
  }
  if (status === 'error') {
    return 'Home shell failed';
  }
  if (status === 'starting') {
    return 'Starting home shell';
  }
  if (status === 'exited') {
    return 'Home shell stopped';
  }
  return 'Home shell idle';
}
