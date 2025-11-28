const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');

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

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Abrir', click: () => showWindow() },
      { type: 'separator' },
      { label: 'Sobre', click: () => showAbout() },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ]);

    tray.setToolTip('Taskvasne');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      showWindow();
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Sobre',
    message: 'Taskvasne v0.0.1',
    detail: 'Desenvolvido por Raphael Kvasne\n\nEmail: raphael@kvasne.com\nSite: kvasne.com',
    buttons: ['OK', 'Visitar Site'],
    icon: path.join(__dirname, 'icon.png')
  }).then(result => {
    if (result.response === 1) {
      shell.openExternal('https://kvasne.com');
    }
  });
}

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

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-ports', async () => {
  return new Promise((resolve, reject) => {
    // 1. Get all processes first using tasklist (faster than querying per PID)
    exec('tasklist /FO CSV /NH', (err, stdout, stderr) => {
      const processMap = new Map();
      if (!err && stdout) {
        stdout.split('\n').forEach(line => {
          // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
          // Example: "chrome.exe","1234","Console","1","10,000 K"
          const parts = line.trim().split(',');
          if (parts.length >= 2) {
            const name = parts[0].replace(/"/g, '');
            const pid = parts[1].replace(/"/g, '');
            processMap.set(pid, name);
          }
        });
      }

      // 2. Get ports using netstat
      exec('netstat -ano', (error, stdout, stderr) => {
        if (error) {
          console.error(`netstat error: ${error}`);
          resolve([]);
          return;
        }

        const lines = stdout.split('\n');
        const results = [];
        const seenPorts = new Set();

        lines.forEach(line => {
          // Line format: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234
          const parts = line.trim().split(/\s+/);
          if (parts.length < 5) return;

          const protocol = parts[0]; // TCP or UDP
          const localAddr = parts[1];
          const state = parts[3]; // LISTENING
          const pid = parts[4];

          // We only care about LISTENING TCP ports usually for dev servers
          if (state === 'LISTENING' && protocol === 'TCP') {
            const portMatch = localAddr.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);

              // Filter: User interested in dev ports (usually > 1000)
              if (port > 1000 && !seenPorts.has(port)) {
                seenPorts.add(port);

                const processName = processMap.get(pid) || 'Desconhecido';

                results.push({
                  LocalPort: port,
                  PID: pid,
                  ProcessName: processName
                });
              }
            }
          }
        });

        results.sort((a, b) => a.LocalPort - b.LocalPort);
        resolve(results);
      });
    });
  });
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
