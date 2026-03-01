interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MARKETING_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';

  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

declare module '*.png' {
  const src: string;
  export default src;
}

// Electron Forge Vite plugin globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

interface ElectronAPI {
  isFullscreen: () => Promise<boolean>;
  onFullscreenChange: (callback: (fullscreen: boolean) => void) => () => void;
  getAppUpdateState: () => Promise<AppUpdateState>;
  checkForAppUpdates: () => Promise<AppUpdateState>;
  installAppUpdate: () => Promise<boolean>;
  onAppUpdateStateChange: (
    callback: (value: AppUpdateState) => void
  ) => () => void;
  openExternalUrl: (url: string) => Promise<void>;
  getPendingAuthDeepLink: () => Promise<string | null>;
  patchGatewayControlUiOrigins: (payload: {
    gatewayUrl: string;
    token: string;
    origins: string[];
    composioDefaultUserId: string;
  }) => Promise<boolean>;
  onAuthDeepLink: (callback: (url: string) => void) => () => void;
}

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

interface Window {
  electronAPI?: ElectronAPI;
}
