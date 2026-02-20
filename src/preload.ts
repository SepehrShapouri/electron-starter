// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

interface AppUpdateState {
  status:
    | 'idle'
    | 'unsupported'
    | 'disabled'
    | 'checking'
    | 'available'
    | 'unavailable'
    | 'downloaded'
    | 'error';
  supported: boolean;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  checkedAt: number | null;
  message: string | null;
}

const electronAPI = {
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen') as Promise<boolean>,
  onFullscreenChange: (callback: (fullscreen: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: boolean) => {
      callback(value);
    };
    ipcRenderer.on('fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('fullscreen-changed', listener);
  },
  getAppUpdateState: () =>
    ipcRenderer.invoke('app-update:get-state') as Promise<AppUpdateState>,
  checkForAppUpdates: () =>
    ipcRenderer.invoke('app-update:check') as Promise<AppUpdateState>,
  installAppUpdate: () =>
    ipcRenderer.invoke('app-update:install') as Promise<boolean>,
  onAppUpdateStateChange: (callback: (value: AppUpdateState) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      value: AppUpdateState
    ) => {
      callback(value);
    };

    ipcRenderer.on('app-update:state-changed', listener);
    return () =>
      ipcRenderer.removeListener('app-update:state-changed', listener);
  },
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke('auth:open-external-url', url) as Promise<void>,
  getPendingAuthDeepLink: () =>
    ipcRenderer.invoke('auth:get-pending-deep-link') as Promise<string | null>,
  patchGatewayControlUiOrigins: (payload: {
    gatewayUrl: string;
    token: string;
    origins: string[];
  }) =>
    ipcRenderer.invoke(
      'gateway:patch-control-ui-origins',
      payload
    ) as Promise<boolean>,
  onAuthDeepLink: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: string) => {
      callback(value);
    };

    ipcRenderer.on('auth:deep-link', listener);
    return () => ipcRenderer.removeListener('auth:deep-link', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
