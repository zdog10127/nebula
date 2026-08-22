const { contextBridge, ipcRenderer } = require('electron')

// The renderer is the same web app used in the browser and talks to the
// backend over plain HTTP/WebSocket, so no privileged Node APIs need to be
// bridged in — except screen sharing, which Electron does not support out of
// the box for navigator.mediaDevices.getDisplayMedia(): the main process must
// pick a desktopCapturer source. We proxy that picker into the renderer so it
// can use the app's own themed UI instead of a bare native dialog.
contextBridge.exposeInMainWorld('electronScreenShare', {
  onSources: (callback) => {
    const listener = (_event, sources) => callback(sources)
    ipcRenderer.on('screen-share-sources', listener)
    return () => ipcRenderer.removeListener('screen-share-sources', listener)
  },
  choose: (sourceId) => ipcRenderer.send('screen-share-source-chosen', sourceId),
})

// Bridges the main process's electron-updater instance (see main.cjs) into the
// renderer so the app can show its own "nova atualização disponível" UI
// instead of native OS dialogs.
function onIpc(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('electronUpdater', {
  onAvailable: (callback) => onIpc('update-available', callback),
  onNotAvailable: (callback) => onIpc('update-not-available', callback),
  onProgress: (callback) => onIpc('update-download-progress', callback),
  onDownloaded: (callback) => onIpc('update-downloaded', callback),
  onError: (callback) => onIpc('update-error', callback),
  download: () => ipcRenderer.invoke('update-download'),
  install: () => ipcRenderer.invoke('update-install'),
  check: () => ipcRenderer.invoke('update-check'),
})

// Bridges the main process's local game-process scan (see gameActivity.cjs) into the
// renderer, which forwards it to the chat hub (see GameActivityReporter.tsx) — the
// detection itself always runs, same as Discord; whether it actually gets sent to
// anyone is gated in the renderer by the user's own "compartilhar jogo" setting.
contextBridge.exposeInMainWorld('electronGameActivity', {
  onChange: (callback) => onIpc('game-activity-changed', callback),
})
