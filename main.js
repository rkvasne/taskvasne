const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');

const fs = require('fs');

// Setup logging
const logPath = path.join(app.getPath('userData'), 'debug.log');
function log(message) {
  try {
    fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
  } catch (e) {
    // Ignore logging errors
  }
}

let mainWindow;
let tray;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log('Second instance detected');
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) showWindow();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    log('App ready');
    const iconPath = path.join(__dirname, 'icon.png');
    log(`Icon path: ${iconPath}`);
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    // Remove native context menu to use the custom window as the menu
    // const contextMenu = Menu.buildFromTemplate([...]);
    // tray.setContextMenu(contextMenu);

    tray.setToolTip('Taskvasne');

    // Toggle window on click (left or right)
    tray.on('click', () => {
      log('Tray clicked');
      toggleWindow();
    });
    tray.on('right-click', () => {
      log('Tray right-clicked');
      toggleWindow();
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.stack}`);
});

function toggleWindow() {
  log('Toggling window');
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

let aboutWindow = null;

function showAbout() {
  // ... (unchanged)
}

// ... (IPC handlers unchanged)

function createWindow() {
  log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#202020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    log('Window loaded index.html');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load window: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.on('blur', () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });
}

function showWindow() {
  log('Showing window...');
  try {
    const trayBounds = tray.getBounds();
    const windowBounds = mainWindow.getBounds();
    log(`Tray bounds: ${JSON.stringify(trayBounds)}`);
    log(`Window bounds: ${JSON.stringify(windowBounds)}`);

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(trayBounds.y - windowBounds.height);

    // Adjust if off screen
    if (x < 0) x = 0;
    if (x + windowBounds.width > width) x = width - windowBounds.width;
    if (y < 0) y = 0;

    log(`Calculated position: ${x}, ${y}`);
    mainWindow.setPosition(x, y, false);

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
      log('Window shown and focused');
    }
  } catch (e) {
    log(`Error in showWindow: ${e.stack}`);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-ports', async () => {
  return new Promise((resolve, reject) => {
    // 1. Get all processes first using tasklist (faster than querying per PID)
    exec('tasklist /FO CSV /NH', { maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      const processMap = new Map();
      if (!err && stdout) {
        stdout.split('\n').forEach(line => {
          const parts = line.trim().split(',');
          if (parts.length >= 2) {
            const name = parts[0].replace(/"/g, '');
            const pid = parts[1].replace(/"/g, '');
            processMap.set(pid, name);
          }
        });
      }

      // 2. Get ports using netstat
      // Increase maxBuffer to 5MB to prevent crash on systems with many connections
      exec('netstat -ano', { maxBuffer: 5 * 1024 * 1024 }, async (error, stdout, stderr) => {
        if (error) {
          console.error(`netstat error: ${error}`);
          // Show error in dev, but in prod maybe just return empty
          resolve([]);
          return;
        }

        const lines = stdout.split('\n');
        const results = [];
        const seenPorts = new Set();

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 5) return;

          const protocol = parts[0];
          const localAddr = parts[1];
          const state = parts[3];
          const pid = parts[4];

          // Check for LISTENING (standard) or OUVINDO (pt-br legacy) just in case
          // Also ensure protocol is TCP
          if ((state === 'LISTENING' || state === 'OUVINDO') && protocol === 'TCP') {
            const portMatch = localAddr.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);

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

        // 3. Enrichment: Try to get project name for generic processes
        const enrichedResults = await Promise.all(results.map(async (item) => {
          if (['node.exe', 'java.exe', 'python.exe'].includes(item.ProcessName.toLowerCase())) {
            try {
              const cmd = await new Promise(res => {
                // Use PowerShell for reliable command line retrieval
                const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${item.PID}' | Select-Object -ExpandProperty CommandLine"`;
                exec(psCommand, (e, out) => {
                  if (e || !out) res('');
                  else res(out.trim());
                });
              });

              // Look for file paths. Match absolute paths.
              // We split by arguments to handle quotes better.
              const parts = cmd.split(/\s+/);

              for (let part of parts) {
                // Remove quotes
                let cleanPart = part.replace(/^"|"$/g, '');

                // Check if it looks like a path and contains the process name (to skip the executable itself)
                if (cleanPart.includes(':\\') && !cleanPart.toLowerCase().endsWith(item.ProcessName.toLowerCase())) {
                  const pathParts = cleanPart.split('\\');
                  if (pathParts.length > 1) {
                    let folderName = pathParts[pathParts.length - 2];

                    if (!pathParts[pathParts.length - 1].includes('.')) {
                      folderName = pathParts[pathParts.length - 1];
                    }

                    if (['bin', 'dist', 'build', 'src', 'lib'].includes(folderName.toLowerCase()) && pathParts.length > 2) {
                      folderName = pathParts[pathParts.length - 3];
                    }

                    if (folderName) {
                      item.ProcessName += ` (${folderName})`;
                      break;
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }
          return item;
        }));

        enrichedResults.sort((a, b) => a.LocalPort - b.LocalPort);
        resolve(enrichedResults);
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
