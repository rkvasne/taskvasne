const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPorts: () => ipcRenderer.invoke('get-ports'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
    quitApp: () => ipcRenderer.send('app-quit'),
    showAbout: () => ipcRenderer.send('app-about'),
    openExternal: (url) => shell.openExternal(url)
});
