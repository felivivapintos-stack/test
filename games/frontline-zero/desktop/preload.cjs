// The only bridge between the game page and the PC shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  settings: () => ipcRenderer.invoke('desktop:settings'),
  setFullscreen: (on) => ipcRenderer.invoke('desktop:fullscreen', on),
  setUncapped: (on) => ipcRenderer.invoke('desktop:uncapped', on),
  restart: () => ipcRenderer.invoke('desktop:restart'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
});
