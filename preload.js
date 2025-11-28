const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPorts: () => ipcRenderer.invoke('get-ports'),
    killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
    quitApp: () => ipcRenderer.send('app-quit'),
    showAbout: () => ipcRenderer.send('app-about')
});
