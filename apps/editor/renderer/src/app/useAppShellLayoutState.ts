import { useCallback, useState } from 'react';
import type {
  ActiveView,
  GateStage,
  HilDrawerPanel,
  HierarchySection,
  ScopedConfigScope,
} from './appLayoutContracts';
import {
  parseActiveView,
  parseGateStage,
  parseHierarchySection,
  parseHilDrawerPanel,
  parseHilDrawerPanelByView,
  parseScopedConfigScope,
} from './appLayoutContracts';

function warnInvalidCompatValue(label: string, value: unknown) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.warn(`[AppShellLayout] ignored invalid ${label}`, { value });
}

export function useAppShellLayoutState() {
  const [activeView, setActiveView] = useState<ActiveView>('agent-cells');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hilDrawerOpen, setHilDrawerOpen] = useState(false);
  const [hilDrawerPanel, setHilDrawerPanel] = useState<HilDrawerPanel>('comments');
  const [hilDrawerPanelByView, setHilDrawerPanelByView] = useState<Record<string, HilDrawerPanel>>(
    {}
  );
  const [hierarchySection, setHierarchySection] = useState<HierarchySection>('actions');
  const [actionsScope, setActionsScope] = useState<ScopedConfigScope>('global');
  const [appShortcutsScope, setAppShortcutsScope] = useState<ScopedConfigScope>('global');
  const [replyQuickPromptsScope, setReplyQuickPromptsScope] = useState<ScopedConfigScope>('global');
  const [sessionNamingScope, setSessionNamingScope] = useState<ScopedConfigScope>('global');
  const [gateScope, setGateScope] = useState<ScopedConfigScope>('global');
  const [gateStage, setGateStage] = useState<GateStage>('active');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMode, setTerminalMode] = useState('shell');

  const setActiveViewCompat = useCallback((view: string) => {
    const parsed = parseActiveView(view);
    if (!parsed) {
      warnInvalidCompatValue('activeView', view);
      return;
    }
    setActiveView(parsed);
  }, []);
  const setHilDrawerPanelCompat = useCallback((panel: string) => {
    const parsed = parseHilDrawerPanel(panel);
    if (!parsed) {
      warnInvalidCompatValue('hilDrawerPanel', panel);
      return;
    }
    setHilDrawerPanel(parsed);
  }, []);
  const setHilDrawerPanelByViewCompat = useCallback(
    (
      value:
        | Record<string, string>
        | ((current: Record<string, string>) => Record<string, string>)
    ) => {
      setHilDrawerPanelByView((current) => {
        const nextValue =
          typeof value === 'function'
            ? value(current as Record<string, string>)
            : value;
        return parseHilDrawerPanelByView(nextValue);
      });
    },
    []
  );
  const setHierarchySectionCompat = useCallback((section: string) => {
    const parsed = parseHierarchySection(section);
    if (!parsed) {
      warnInvalidCompatValue('hierarchySection', section);
      return;
    }
    setHierarchySection(parsed);
  }, []);
  const setActionsScopeCompat = useCallback((scope: string) => {
    const parsed = parseScopedConfigScope(scope);
    if (!parsed) {
      warnInvalidCompatValue('actionsScope', scope);
      return;
    }
    setActionsScope(parsed);
  }, []);
  const setAppShortcutsScopeCompat = useCallback((scope: string) => {
    const parsed = parseScopedConfigScope(scope);
    if (!parsed) {
      warnInvalidCompatValue('appShortcutsScope', scope);
      return;
    }
    setAppShortcutsScope(parsed);
  }, []);
  const setReplyQuickPromptsScopeCompat = useCallback((scope: string) => {
    const parsed = parseScopedConfigScope(scope);
    if (!parsed) {
      warnInvalidCompatValue('replyQuickPromptsScope', scope);
      return;
    }
    setReplyQuickPromptsScope(parsed);
  }, []);
  const setSessionNamingScopeCompat = useCallback((scope: string) => {
    const parsed = parseScopedConfigScope(scope);
    if (!parsed) {
      warnInvalidCompatValue('sessionNamingScope', scope);
      return;
    }
    setSessionNamingScope(parsed);
  }, []);
  const setGateScopeCompat = useCallback((scope: string) => {
    const parsed = parseScopedConfigScope(scope);
    if (!parsed) {
      warnInvalidCompatValue('gateScope', scope);
      return;
    }
    setGateScope(parsed);
  }, []);
  const setGateStageCompat = useCallback((stage: string) => {
    const parsed = parseGateStage(stage);
    if (!parsed) {
      warnInvalidCompatValue('gateStage', stage);
      return;
    }
    setGateStage(parsed);
  }, []);

  return {
    activeView,
    setActiveView,
    setActiveViewCompat,
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    setSidebarCollapsed,
    hilDrawerOpen,
    setHilDrawerOpen,
    hilDrawerPanel,
    setHilDrawerPanel,
    setHilDrawerPanelCompat,
    hilDrawerPanelByView,
    setHilDrawerPanelByView,
    setHilDrawerPanelByViewCompat,
    hierarchySection,
    setHierarchySection,
    setHierarchySectionCompat,
    actionsScope,
    setActionsScope,
    setActionsScopeCompat,
    appShortcutsScope,
    setAppShortcutsScope,
    setAppShortcutsScopeCompat,
    replyQuickPromptsScope,
    setReplyQuickPromptsScope,
    setReplyQuickPromptsScopeCompat,
    sessionNamingScope,
    setSessionNamingScope,
    setSessionNamingScopeCompat,
    gateScope,
    setGateScope,
    setGateScopeCompat,
    gateStage,
    setGateStage,
    setGateStageCompat,
    terminalOpen,
    setTerminalOpen,
    terminalMode,
    setTerminalMode,
  };
}
