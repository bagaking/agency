import { useCallback, useEffect } from 'react';

type UseHilDrawerControllerArgs = {
  activeView: string;
  hilDrawerOpen: boolean;
  hilDrawerPanel: string;
  setHilDrawerOpen: (value: boolean) => void;
  setHilDrawerPanel: (value: string) => void;
  setHilDrawerPanelByView: (value: any) => void;
};

export function useHilDrawerController({
  activeView,
  hilDrawerOpen,
  hilDrawerPanel,
  setHilDrawerOpen,
  setHilDrawerPanel,
  setHilDrawerPanelByView,
}: UseHilDrawerControllerArgs) {
  useEffect(() => {
    if (activeView === 'agent-cells') {
      setHilDrawerOpen(true);
      setHilDrawerPanel('reply');
    }
  }, [activeView, setHilDrawerOpen, setHilDrawerPanel]);

  useEffect(() => {
    if (hilDrawerOpen && activeView === 'agent-cells' && hilDrawerPanel !== 'reply') {
      setHilDrawerPanel('reply');
    }
  }, [activeView, hilDrawerOpen, hilDrawerPanel, setHilDrawerPanel]);

  const openHilDrawer = useCallback(
    (panel = 'comments') => {
      setHilDrawerPanel(panel);
      setHilDrawerOpen(true);
    },
    [setHilDrawerOpen, setHilDrawerPanel]
  );

  const handleSelectHilDrawerPanel = useCallback(
    (panel: string) => {
      if (!panel) {
        return;
      }
      setHilDrawerPanel(panel);
      setHilDrawerPanelByView((current: any) => ({
        ...current,
        [activeView]: panel,
      }));
    },
    [activeView, setHilDrawerPanel, setHilDrawerPanelByView]
  );

  return {
    openHilDrawer,
    handleSelectHilDrawerPanel,
  };
}

