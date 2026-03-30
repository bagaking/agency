import { useEffect, useState } from 'react';

import { getWorkbenchProjectPolicy } from '../../services/agencyBridge';
import {
  normalizeWorkbenchProjectLanguageRules,
  type WorkbenchProjectLanguageRule,
} from '../../../../shared/workbenchLanguageCore';

type WorkbenchProjectPolicyState = {
  projectRoot: string;
  sourcePath: string;
  languages: {
    overrides: WorkbenchProjectLanguageRule[];
  };
};

const DEFAULT_POLICY_STATE: WorkbenchProjectPolicyState = {
  projectRoot: '',
  sourcePath: '',
  languages: {
    overrides: [],
  },
};

export function useWorkbenchProjectPolicy(rootPath?: string) {
  const [policyState, setPolicyState] = useState<WorkbenchProjectPolicyState>(DEFAULT_POLICY_STATE);

  useEffect(() => {
    let cancelled = false;

    if (!rootPath) {
      setPolicyState(DEFAULT_POLICY_STATE);
      return () => {
        cancelled = true;
      };
    }

    const loadPolicy = async () => {
      try {
        const result = await getWorkbenchProjectPolicy({ rootPath });
        if (cancelled) {
          return;
        }
        const normalizedOverrides = normalizeWorkbenchProjectLanguageRules(
          result?.policy?.languages?.overrides
        );
        setPolicyState({
          projectRoot: String(result?.projectRoot || ''),
          sourcePath: String(result?.sourcePath || ''),
          languages: {
            overrides: normalizedOverrides,
          },
        });
      } catch (_error) {
        if (!cancelled) {
          setPolicyState(DEFAULT_POLICY_STATE);
        }
      }
    };

    void loadPolicy();

    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  return policyState;
}
