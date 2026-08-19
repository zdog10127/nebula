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
