import {
  getWorkbenchLanguageLabel,
  getWorkbenchLanguageOption,
  matchWorkbenchProjectLanguageRule,
  normalizeWorkbenchLanguageId,
  type WorkbenchProjectLanguageRule,
} from '../../../../shared/workbenchLanguageCore';
import { resolveWorkbenchLanguage } from './workbenchFileType';

export type WorkbenchLanguageDecisionSource = 'builtin' | 'project' | 'manual';

export type WorkbenchLanguageDecision = {
  language: string;
  label: string;
  source: WorkbenchLanguageDecisionSource;
  sourceLabel: string;
  provider: string;
  matchedRule: WorkbenchProjectLanguageRule | null;
};

const buildDecision = ({
  language,
  source,
  matchedRule = null,
}: {
  language: string;
  source: WorkbenchLanguageDecisionSource;
  matchedRule?: WorkbenchProjectLanguageRule | null;
}): WorkbenchLanguageDecision => {
  const normalizedLanguage = normalizeWorkbenchLanguageId(language);
  const option = getWorkbenchLanguageOption(normalizedLanguage);
  return {
    language: normalizedLanguage,
    label: getWorkbenchLanguageLabel(normalizedLanguage),
    source,
    sourceLabel:
      source === 'manual'
        ? 'Local Override'
        : source === 'project'
          ? 'Project Rule'
          : 'Auto',
    provider: option?.provider || 'monaco-native',
    matchedRule,
  };
};

export function resolveWorkbenchLanguageDecision({
  targetPath,
  manualLanguage,
  projectRules = [],
}: {
  targetPath: string;
  manualLanguage?: string | null;
  projectRules?: WorkbenchProjectLanguageRule[];
}): WorkbenchLanguageDecision {
  const normalizedManualLanguage = normalizeWorkbenchLanguageId(manualLanguage, '');
  if (normalizedManualLanguage) {
    return buildDecision({
      language: normalizedManualLanguage,
      source: 'manual',
    });
  }

  const matchedRule = matchWorkbenchProjectLanguageRule(targetPath, projectRules);
  if (matchedRule) {
    return buildDecision({
      language: matchedRule.language,
      source: 'project',
      matchedRule,
    });
  }

  return buildDecision({
    language: resolveWorkbenchLanguage(targetPath),
    source: 'builtin',
  });
}
