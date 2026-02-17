/// <reference types="vite/client" />

declare module '*.svg' {
  import type { FunctionComponent, SVGProps } from 'react';

  const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Electron Forge Vite plugin globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

interface ElectronAPI {
  isFullscreen: () => Promise<boolean>;
  onFullscreenChange: (callback: (fullscreen: boolean) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
