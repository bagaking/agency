const path = require('path');

const { getSessionNamingSettings } = require('../../sessionNaming') as {
  getSessionNamingSettings: (input: { scope?: string; worktreePath?: string }) => Promise<any>;
};
const { getRepoRoot } = require('../../git') as {
  getRepoRoot: (worktreePath: string) => Promise<string>;
};

type SessionRuntimePayload = {
  worktreePath: string;
  cellId: string;
  cellName: string;
  cellBranch: string;
  sessionId: string;
  sessionName: string;
};

type SkillPackStep = {
  agent?: {
    sessionRuntime?: Partial<SessionRuntimePayload>;
  };
};

type PreparedContext = {
  payload: SessionRuntimePayload;
  session: Record<string, any> | null;
  runtime: Record<string, any> | null;
  pane: Record<string, any> | null;
  outputExcerpt: string;
  namingSettings: Record<string, any> | null;
  projectName: string;
};

const GENERIC_SESSION_NAME_PATTERNS = [
  /^(session|new session|untitled)$/i,
  /^(cli|shell|terminal|codex|claude|gemini)(\s*[-:/]\s*(cli|shell|terminal|codex|claude|gemini))*$/i,
];

function normalizeText(value: unknown, maxLength = 900): string {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function toNameCandidate(value: unknown, maxLength = 48): string {
  const text = String(value || '')
    .replace(/\r\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/[<>{}[\]()`"'“”‘’]/g, ' ')
    .replace(/[\/:_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return '';
  }
  const compact = text.length <= maxLength ? text : text.slice(0, maxLength).trim();
  return compact.replace(/\s+/g, ' ');
}

function isGenericSessionName(value: unknown): boolean {
  const text = toNameCandidate(value);
  if (!text) {
    return true;
  }
  return GENERIC_SESSION_NAME_PATTERNS.some((pattern) => pattern.test(text));
}

function titleCaseWords(value: unknown): string {
  return toNameCandidate(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractBranchTail(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const tail = raw.split('/').pop() || raw;
  return titleCaseWords(tail);
}

function buildFallbackCandidates(preparedContext: PreparedContext | null | undefined): string[] {
  const sessionName = toNameCandidate(preparedContext?.payload?.sessionName || preparedContext?.session?.name || '');
  const runtimeTool = titleCaseWords(preparedContext?.runtime?.tool || '');
  const branchTail = extractBranchTail(preparedContext?.payload?.cellBranch || '');
  const cellNameTail = extractBranchTail(preparedContext?.payload?.cellName || '');
  const projectName = titleCaseWords(preparedContext?.projectName || '');
  const candidates = new Set<string>();

  if (sessionName && !isGenericSessionName(sessionName)) {
    candidates.add(sessionName);
  }

  if (branchTail) {
    candidates.add(branchTail);
    if (runtimeTool) {
      candidates.add(`${branchTail} ${runtimeTool}`);
    }
  }

  if (cellNameTail) {
    candidates.add(cellNameTail);
    if (runtimeTool) {
      candidates.add(`${cellNameTail} ${runtimeTool}`);
    }
  }

  if (projectName && runtimeTool) {
    candidates.add(`${projectName} ${runtimeTool}`);
  } else if (projectName) {
    candidates.add(projectName);
  }

  if (runtimeTool && !candidates.size) {
    candidates.add(`${runtimeTool} Session`);
  }

  return Array.from(candidates)
    .map((item) => toNameCandidate(item))
    .filter((item) => item && !isGenericSessionName(item))
    .slice(0, 3);
}

function buildSessionRuntimePayload(step: SkillPackStep = {}): SessionRuntimePayload {
  const agent = step?.agent && typeof step.agent === 'object' ? step.agent : {};
  const sessionRuntime =
    agent?.sessionRuntime && typeof agent.sessionRuntime === 'object'
      ? agent.sessionRuntime
      : {};
  return {
    worktreePath: String(sessionRuntime.worktreePath || '').trim(),
    cellId: String(sessionRuntime.cellId || '').trim(),
    cellName: String(sessionRuntime.cellName || '').trim(),
    cellBranch: String(sessionRuntime.cellBranch || '').trim(),
    sessionId: String(sessionRuntime.sessionId || '').trim(),
    sessionName: String(sessionRuntime.sessionName || '').trim(),
  };
}

function buildSmartNameDecisionSchema() {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: {
        type: 'string',
        enum: ['suggest', 'fail'],
      },
      summary: {
        type: 'string',
      },
      candidates: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 64,
        },
        minItems: 0,
        maxItems: 3,
      },
      failure: {
        type: 'object',
        additionalProperties: false,
        properties: {
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['mode', 'summary', 'candidates'],
  };
}

function validateSmartNameDecision(decision: Record<string, any> = {}) {
  const mode = String(decision?.mode || '').trim().toLowerCase();
  const candidates = Array.isArray(decision?.candidates)
    ? decision.candidates.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  if (!['suggest', 'fail'].includes(mode)) {
    const error = new Error(`Unsupported smart-name mode: ${mode || 'unknown'}.`) as Error & {
      code?: string;
    };
    error.code = 'INVALID_PROVIDER_DECISION';
    throw error;
  }

  if (mode === 'fail') {
    if (!decision?.failure?.message) {
      const error = new Error('Smart-name failure decisions require failure metadata.') as Error & {
        code?: string;
      };
      error.code = 'INVALID_PROVIDER_DECISION';
      throw error;
    }
    return;
  }

  if (candidates.length < 1 || candidates.length > 3) {
    const error = new Error('Smart-name decisions require 1 to 3 candidate names.') as Error & {
      code?: string;
    };
    error.code = 'INVALID_PROVIDER_DECISION';
    throw error;
  }
}

async function resolveProjectName(worktreePath = '') {
  const normalized = String(worktreePath || '').trim();
  if (!normalized) {
    return '';
  }
  try {
    const repoRoot = await getRepoRoot(normalized);
    return path.basename(repoRoot || normalized);
  } catch (_error) {
    return path.basename(normalized);
  }
}

export function createSessionSmartNameSkillPack() {
  return {
    id: 'session.smart-name',
    title: 'Session Smart Name',
    allowedCapabilities: ['session.runtime'],
    providerHints: {
      defaultProviderId: 'codex_cli',
      retryPolicy: {
        maxAttempts: 1,
        baseDelayMs: 100,
        timeoutMs: 12_000,
      },
    },
    instruction:
      'Suggest short session names based on current session context and recent visible output. Prefer concrete, recognizable names over generic labels. Never return more than 3 candidates.',
    rules: [
      'Do not invoke any host-managed capabilities beyond session.runtime inspect that was already prepared for you.',
      'Keep candidate names short and human-scannable.',
      'Avoid generic names like Session 1, New Session, or Untitled unless the context truly contains nothing useful.',
      'Do not include surrounding quotes, numbering, or explanations inside candidate names.',
    ],
    async prepare({
      step,
      invokeCapability,
    }: {
      step?: SkillPackStep;
      invokeCapability: (payload: {
        step?: SkillPackStep;
        capabilityId: string;
        title: string;
        input: Record<string, any>;
      }) => Promise<{ response?: { data?: any } }>;
    }): Promise<PreparedContext> {
      const payload = buildSessionRuntimePayload(step);
      const inspect = await invokeCapability({
        step,
        capabilityId: 'session.runtime',
        title: 'Inspect session for smart naming',
        input: {
          intent: 'inspect',
          worktreePath: payload.worktreePath,
          sessionId: payload.sessionId,
          lines: 120,
        },
      });
      const inspectData = inspect?.response?.data || {};
      const namingSettings = payload.worktreePath
        ? await getSessionNamingSettings({
            scope: 'resolved',
            worktreePath: payload.worktreePath,
          }).catch(() => null)
        : null;
      return {
        payload,
        session: inspectData?.session || null,
        runtime: inspectData?.runtime || null,
        pane: inspectData?.pane || null,
        outputExcerpt: normalizeText(inspectData?.output, 1200),
        namingSettings,
        projectName: await resolveProjectName(payload.worktreePath),
      };
    },
    buildDecisionSchema() {
      return buildSmartNameDecisionSchema();
    },
    buildDeterministicDecision({
      preparedContext,
    }: {
      preparedContext?: PreparedContext;
    }) {
      const candidates = buildFallbackCandidates(preparedContext);
      if (!candidates.length) {
        return {
          mode: 'fail',
          summary: 'Fallback naming could not derive useful candidates.',
          candidates: [],
          failure: {
            code: 'SMART_NAME_NO_FALLBACK_CANDIDATES',
            message: 'Commander fallback could not derive useful session names from the current context.',
          },
        };
      }
      return {
        mode: 'suggest',
        summary: 'Fallback naming suggestions derived from current session context.',
        candidates,
      };
    },
    validateDecision(decision: Record<string, any>) {
      validateSmartNameDecision(decision);
    },
    resolveWorkingDirectory({ preparedContext }: { preparedContext?: PreparedContext }) {
      return preparedContext?.payload?.worktreePath || process.cwd();
    },
    buildCapabilityCalls({ decision }: { decision?: Record<string, any> }) {
      const mode = String(decision?.mode || '').trim().toLowerCase();
      if (mode === 'fail') {
        const error = new Error(
          decision?.failure?.message || 'Smart naming failed before execution.'
        ) as Error & { code?: string };
        error.code = String(decision?.failure?.code || 'SMART_NAME_FAILED');
        throw error;
      }
      return [];
    },
    finalize({
      decision,
      preparedContext,
      providerDecision,
    }: {
      decision?: Record<string, any>;
      preparedContext?: PreparedContext;
      providerDecision?: Record<string, any> | null;
    }) {
      const candidates = Array.isArray(decision?.candidates)
        ? decision.candidates.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      return {
        mode: String(decision?.mode || 'suggest').trim().toLowerCase(),
        summary: String(decision?.summary || '').trim(),
        candidates,
        session: preparedContext?.session || null,
        context: {
          sessionId: preparedContext?.payload?.sessionId || '',
          sessionName:
            preparedContext?.payload?.sessionName ||
            preparedContext?.session?.name ||
            '',
          cellId: preparedContext?.payload?.cellId || '',
          cellName: preparedContext?.payload?.cellName || '',
          branch: preparedContext?.payload?.cellBranch || '',
          project: preparedContext?.projectName || '',
          profileId: preparedContext?.session?.profileId || '',
          runtimeTool: preparedContext?.runtime?.tool || '',
          outputExcerpt: preparedContext?.outputExcerpt || '',
          namingRule: preparedContext?.namingSettings?.rule || '',
        },
        metadata: {
          providerThreadId: String(providerDecision?.threadId || '').trim(),
          providerFallbackUsed: Boolean(providerDecision?.fallbackUsed),
          providerFallbackReason: String(providerDecision?.fallbackReason || '').trim(),
        },
      };
    },
  };
}
