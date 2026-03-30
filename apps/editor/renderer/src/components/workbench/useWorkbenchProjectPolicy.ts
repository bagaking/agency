import { useEffect, useState } from 'react';

import { getWorkbenchProjectPolicy, onExplorerChanged } from '../../services/agencyBridge';
import {
  normalizeWorkbenchProjectLanguageRules,
  type WorkbenchProjectLanguageRule,
} from '../../../../shared/workbenchLanguageCore';

type WorkbenchProjectPolicyState = {
  projectRoot: string;
  sourcePath: string;
  warnings: string[];
  loading: boolean;
  error: string;
  languages: {
    overrides: WorkbenchProjectLanguageRule[];
  };
};

const DEFAULT_POLICY_STATE: WorkbenchProjectPolicyState = {
  projectRoot: '',
  sourcePath: '',
  warnings: [],
  loading: false,
  error: '',
  languages: {
    overrides: [],
  },
};

export function useWorkbenchProjectPolicy(rootPath?: string) {
  const [policyState, setPolicyState] = useState<WorkbenchProjectPolicyState>(DEFAULT_POLICY_STATE);

  useEffect(() => {
    let cancelled = false;

    const loadPolicy = async () => {
      if (!rootPath) {
        if (!cancelled) {
          setPolicyState(DEFAULT_POLICY_STATE);
        }
        return;
      }

      setPolicyState((current) => ({
        ...current,
        loading: true,
        error: '',
      }));

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
          warnings: Array.isArray(result?.warnings)
            ? result.warnings.map((entry: unknown) => String(entry || '').trim()).filter(Boolean)
            : [],
          loading: false,
          error: '',
          languages: {
            overrides: normalizedOverrides,
          },
        });
      } catch (error: any) {
        if (!cancelled) {
          setPolicyState({
            ...DEFAULT_POLICY_STATE,
            loading: false,
            error: error?.message || 'Failed to load workbench project policy.',
          });
        }
      }
    };

    if (!rootPath) {
      void loadPolicy();
      return () => {
        cancelled = true;
      };
    }

    void loadPolicy();

    const unsubscribe = onExplorerChanged((payload) => {
      const changedPaths = Array.isArray(payload?.paths) ? payload.paths : [];
      const policyChanged = changedPaths.some((entry) => {
        const normalized = String(entry || '').replace(/\\/g, '/');
        return normalized === '.agency/workbench.yaml' || normalized === '.agency/workbench.yml';
      });
      if (policyChanged) {
        void loadPolicy();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [rootPath]);

  return policyState;
}
