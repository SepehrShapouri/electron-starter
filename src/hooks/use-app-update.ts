import * as React from 'react';

export function useAppUpdate() {
  const [updateState, setUpdateState] = React.useState<AppUpdateState | null>(
    null
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return;
    }

    let cancelled = false;

    window.electronAPI
      .getAppUpdateState()
      .then(state => {
        if (!cancelled) {
          setUpdateState(state);
        }
      })
      .catch(() => {});

    const cleanup = window.electronAPI.onAppUpdateStateChange(state => {
      if (!cancelled) {
        setUpdateState(state);
      }
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const checkForUpdates = React.useCallback(async () => {
    if (!window.electronAPI) {
      return null;
    }

    try {
      const state = await window.electronAPI.checkForAppUpdates();
      setUpdateState(state);
      return state;
    } catch {
      return null;
    }
  }, []);

  const installUpdate = React.useCallback(async () => {
    if (!window.electronAPI) {
      return false;
    }

    try {
      return await window.electronAPI.installAppUpdate();
    } catch {
      return false;
    }
  }, []);

  return {
    updateState,
    checkForUpdates,
    installUpdate,
  };
}
