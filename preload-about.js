const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose safe API for About window
contextBridge.exposeInMainWorld('aboutAPI', {
    closeWindow: () => ipcRenderer.send('about-close'),
    openExternal: (url) => shell.openExternal(url)
});
