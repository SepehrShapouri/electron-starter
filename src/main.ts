import { app, autoUpdater, BrowserWindow, ipcMain, shell } from 'electron';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

type AppUpdateStatus =
  | 'idle'
  | 'unsupported'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'downloaded'
  | 'error';

interface AppUpdateState {
  status: AppUpdateStatus;
  supported: boolean;
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  checkedAt: number | null;
  message: string | null;
}

const UPDATE_STATE_EVENT = 'app-update:state-changed';

const parseRepositoryCoordinates = (value: string) => {
  const trimmed = value.trim();

  const directMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (directMatch) {
    return {
      owner: directMatch[1],
      name: directMatch[2],
    };
  }

  const githubMatch = trimmed.match(
    /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i
  );
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      name: githubMatch[2],
    };
  }

  return null;
};

const readRepositoryFromPackageManifest = () => {
  try {
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    const packageJsonRaw = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as {
      electronBoilerplate?: { updateRepository?: string };
      repository?: string | { url?: string };
    };

    if (
      packageJson.electronBoilerplate &&
      typeof packageJson.electronBoilerplate === 'object' &&
      typeof packageJson.electronBoilerplate.updateRepository === 'string'
    ) {
      return parseRepositoryCoordinates(
        packageJson.electronBoilerplate.updateRepository
      );
    }

    if (typeof packageJson.repository === 'string') {
      return parseRepositoryCoordinates(packageJson.repository);
    }

    if (
      packageJson.repository &&
      typeof packageJson.repository === 'object' &&
      typeof packageJson.repository.url === 'string'
    ) {
      return parseRepositoryCoordinates(packageJson.repository.url);
    }

    return null;
  } catch {
    return null;
  }
};

const envRepository =
  process.env.UPDATE_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? '';
const updateRepository =
  parseRepositoryCoordinates(envRepository) ??
  readRepositoryFromPackageManifest();
const updateRepositoryOwner = updateRepository?.owner ?? '';
const updateRepositoryName = updateRepository?.name ?? '';
const hasUpdateRepository =
  Boolean(updateRepositoryOwner) && Boolean(updateRepositoryName);
const supportsUpdatesOnPlatform =
  process.platform === 'darwin' || process.platform === 'win32';

const baseUpdateState: AppUpdateState = {
  status: 'idle',
  supported: false,
  currentVersion: app.getVersion(),
  availableVersion: null,
  releaseNotes: null,
  checkedAt: null,
  message: null,
};

let appUpdateState: AppUpdateState = baseUpdateState;
let autoUpdateInterval: NodeJS.Timeout | null = null;
let mainWindow: BrowserWindow | null = null;

const focusMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
};

const isAutoUpdateEnabled = () =>
  app.isPackaged && supportsUpdatesOnPlatform && hasUpdateRepository;

const getUpdateFeedUrl = () =>
  `https://update.electronjs.org/${updateRepositoryOwner}/${updateRepositoryName}/${process.platform}-${process.arch}/${app.getVersion()}`;

const getReleaseNotesText = (releaseNotes: unknown): string | null => {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    const firstNote = releaseNotes.find(
      note =>
        typeof note === 'object' &&
        note !== null &&
        'note' in note &&
        typeof note.note === 'string'
    );

    if (firstNote && typeof firstNote.note === 'string') {
      return firstNote.note;
    }
  }

  return null;
};

const getUpdateVersion = (updateInfo: unknown): string | null => {
  if (
    typeof updateInfo === 'object' &&
    updateInfo !== null &&
    'version' in updateInfo &&
    typeof updateInfo.version === 'string'
  ) {
    return updateInfo.version;
  }

  return null;
};

const sendUpdateState = (window: BrowserWindow) => {
  if (window.isDestroyed()) {
    return;
  }

  window.webContents.send(UPDATE_STATE_EVENT, appUpdateState);
};

const broadcastUpdateState = () => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(sendUpdateState);
};

const setAppUpdateState = (next: Partial<AppUpdateState>) => {
  appUpdateState = {
    ...appUpdateState,
    ...next,
    currentVersion: app.getVersion(),
  };
  broadcastUpdateState();
};

const checkForAppUpdates = (manual = false) => {
  if (!isAutoUpdateEnabled()) {
    return appUpdateState;
  }

  if (appUpdateState.status === 'checking') {
    return appUpdateState;
  }

  if (appUpdateState.status === 'available') {
    if (manual) {
      setAppUpdateState({
        message: 'Update is already downloading in the background.',
      });
    }

    return appUpdateState;
  }

  if (appUpdateState.status === 'downloaded') {
    if (manual) {
      setAppUpdateState({
        message: 'Update is ready to install.',
      });
    }

    return appUpdateState;
  }

  setAppUpdateState({
    status: 'checking',
    checkedAt: Date.now(),
    message: manual ? 'Checking for updates...' : appUpdateState.message,
  });

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start update check.';

    setAppUpdateState({
      status: 'error',
      message,
    });
  }

  return appUpdateState;
};

const initializeAutoUpdates = () => {
  if (!supportsUpdatesOnPlatform) {
    setAppUpdateState({
      status: 'unsupported',
      supported: false,
      message: 'Automatic updates are only available on macOS and Windows.',
    });
    return;
  }

  if (!app.isPackaged) {
    setAppUpdateState({
      status: 'disabled',
      supported: false,
      message: 'Automatic updates are disabled in development builds.',
    });
    return;
  }

  if (!hasUpdateRepository) {
    setAppUpdateState({
      status: 'disabled',
      supported: false,
      message:
        'Set electronBoilerplate.updateRepository or UPDATE_REPOSITORY to enable automatic updates.',
    });
    return;
  }

  autoUpdater.setFeedURL({
    url: getUpdateFeedUrl(),
  });

  const autoUpdaterEvents = autoUpdater as unknown as NodeJS.EventEmitter;

  autoUpdaterEvents.on('checking-for-update', () => {
    setAppUpdateState({
      status: 'checking',
      supported: true,
      checkedAt: Date.now(),
      message: 'Checking for updates...',
    });
  });

  autoUpdaterEvents.on('update-available', (updateInfo: unknown) => {
    setAppUpdateState({
      status: 'available',
      supported: true,
      availableVersion: getUpdateVersion(updateInfo),
      releaseNotes: getReleaseNotesText(
        typeof updateInfo === 'object' && updateInfo !== null
          ? 'releaseNotes' in updateInfo
            ? updateInfo.releaseNotes
            : null
          : null
      ),
      message: 'Update found. Downloading in the background.',
    });
  });

  autoUpdaterEvents.on('update-not-available', () => {
    setAppUpdateState({
      status: 'unavailable',
      supported: true,
      availableVersion: null,
      releaseNotes: null,
      checkedAt: Date.now(),
      message: 'You are up to date.',
    });
  });

  autoUpdaterEvents.on(
    'update-downloaded',
    (_event: unknown, releaseNotes: unknown, releaseName: unknown) => {
      setAppUpdateState({
        status: 'downloaded',
        supported: true,
        availableVersion:
          typeof releaseName === 'string' && releaseName.length > 0
            ? releaseName
            : appUpdateState.availableVersion,
        releaseNotes: getReleaseNotesText(releaseNotes),
        message: 'Update downloaded. Restart the app to install it.',
      });
    }
  );

  autoUpdaterEvents.on('error', (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : 'Something went wrong while updating.';

    if (
      message.includes('The command is disabled and cannot be executed') &&
      (appUpdateState.status === 'available' ||
        appUpdateState.status === 'downloaded')
    ) {
      setAppUpdateState({
        supported: true,
        message:
          appUpdateState.status === 'downloaded'
            ? 'Update is ready to install.'
            : 'Update is downloading in the background.',
      });
      return;
    }

    setAppUpdateState({
      status: 'error',
      supported: true,
      message,
    });
  });

  setAppUpdateState({
    status: 'idle',
    supported: true,
    message: null,
  });

  checkForAppUpdates();
  autoUpdateInterval = setInterval(() => {
    checkForAppUpdates();
  }, 60 * 60 * 1000);
};

if (started) {
  app.quit();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  focusMainWindow();
});

ipcMain.handle('is-fullscreen', () => {
  return BrowserWindow.getFocusedWindow()?.isFullScreen() ?? false;
});

ipcMain.handle('app-update:get-state', () => {
  return appUpdateState;
});

ipcMain.handle('app-update:check', () => {
  return checkForAppUpdates(true);
});

ipcMain.handle('app-update:install', () => {
  if (!isAutoUpdateEnabled() || appUpdateState.status !== 'downloaded') {
    return false;
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall();
  });

  return true;
});

ipcMain.handle('auth:open-external-url', async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('auth:get-pending-deep-link', () => {
  return null;
});

const createWindow = () => {
  const isMac = process.platform === 'darwin';
  const isDev = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);

  mainWindow = new BrowserWindow({
    width: 1260,
    height: 820,
    minHeight: 720,
    minWidth: 1080,
    icon: path.join(app.getAppPath(), 'src', 'assets', 'Icon.icns'),
    frame: isMac,
    backgroundColor: '#020617',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? {
          trafficLightPosition: { x: 18, y: 20 },
        }
      : {}),
    autoHideMenuBar: true,
    ...(!isMac
      ? {
          titleBarOverlay: {
            color: '#020617',
            symbolColor: '#f8fafc',
            height: 30,
          },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  const window = mainWindow;

  window.on('enter-full-screen', () => {
    window.webContents.send('fullscreen-changed', true);
  });

  window.on('leave-full-screen', () => {
    window.webContents.send('fullscreen-changed', false);
  });

  window.webContents.on('did-finish-load', () => {
    sendUpdateState(window);
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (isDev) {
    window.webContents.openDevTools();
  }
};

app.on('ready', () => {
  createWindow();
  initializeAutoUpdates();
});

app.on('window-all-closed', () => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
