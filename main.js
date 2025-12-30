const { app, BrowserWindow, Tray, ipcMain, nativeImage, screen, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { getPorts } = require('./port-manager');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

let mainWindow;
let tray;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.info('Second instance detected, quitting...');
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    log.info('Second instance attempted, focusing main window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) showWindow();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    // Remove native context menu to use the custom window as the menu
    // const contextMenu = Menu.buildFromTemplate([...]);
    // tray.setContextMenu(contextMenu);

    tray.setToolTip('Taskvasne');

    // Toggle window on click (left or right)
    tray.on('click', () => toggleWindow());
    tray.on('right-click', () => toggleWindow());

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

/**
 * Toggles window visibility (show/hide)
 * @returns {void}
 */
function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

let aboutWindow = null;

/**
 * Shows the About modal window
 * Creates a new modal if it doesn't exist, otherwise focuses existing one
 * @returns {void}
 */
function showAbout() {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 320,
    height: 340,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Sobre',
    frame: false, // Frameless for custom style
    parent: mainWindow,
    modal: true,
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-about.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  aboutWindow.loadFile('about.html');

  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}

// IPC Handlers for UI buttons
ipcMain.on('app-quit', () => {
  log.info('Quit requested by user');
  app.quit();
});

ipcMain.on('app-about', () => {
  showAbout();
});

ipcMain.on('about-close', () => {
  if (aboutWindow) {
    aboutWindow.close();
  }
});

/**
 * Creates the main application window
 * @returns {void}
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    transparent: true, // Try for rounded corners effect
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

/**
 * Shows the window near the system tray icon
 * Positions the window above the tray icon with proper bounds checking
 * @returns {void}
 */
function showWindow() {
  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();

  // Basic positioning logic for Windows (bottom-right usually)
  // We'll center it horizontally over the tray icon if possible, or snap to corner

  const { width } = screen.getPrimaryDisplay().workAreaSize;

  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y - windowBounds.height);

  // Adjust if off screen
  if (x < 0) x = 0;
  if (x + windowBounds.width > width) x = width - windowBounds.width;
  if (y < 0) y = 0; // Should not happen if taskbar is bottom

  // If taskbar is top/left/right, this logic is simplistic, but sufficient for MVP

  mainWindow.setPosition(x, y, false);
  mainWindow.show();
  mainWindow.focus();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



ipcMain.handle('get-ports', async () => {
  return await getPorts();
});

ipcMain.handle('kill-process', async (event, pid) => {
  return new Promise((resolve, _reject) => {
    // Security: Sanitize PID to prevent command injection
    const safePid = parseInt(pid, 10);
    if (isNaN(safePid) || safePid <= 0) {
      resolve({ success: false, error: 'Invalid PID' });
      return;
    }
    
    exec(`taskkill /F /PID ${safePid}`, (error, stdout, stderr) => {
      if (error) {
        log.error(`Failed to kill process ${safePid}: ${stderr}`);
        resolve({ success: false, error: stderr });
      } else {
        log.info(`Successfully killed process ${safePid}`);
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    log.info(`Opening external URL: ${url}`);
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error(`Failed to open external URL: ${error.message}`);
    return { success: false, error: error.message };
  }
});
