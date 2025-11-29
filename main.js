const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { getPorts } = require('./port-manager');

let mainWindow;
let tray;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
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

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

let aboutWindow = null;

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
      nodeIntegration: true,
      contextIsolation: false // For simple internal page
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
  app.quit();
});

ipcMain.on('app-about', () => {
  showAbout();
});

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

function showWindow() {
  const trayBounds = tray.getBounds();
  const windowBounds = mainWindow.getBounds();

  // Basic positioning logic for Windows (bottom-right usually)
  // We'll center it horizontally over the tray icon if possible, or snap to corner

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

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
  return new Promise((resolve, reject) => {
    exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
