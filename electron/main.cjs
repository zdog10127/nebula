const { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, desktopCapturer, ipcMain } = require('electron')
const path = require('node:path')
const http = require('node:http')
const fs = require('node:fs')
const { URL } = require('node:url')
const { autoUpdater } = require('electron-updater')
const { startGameActivityWatcher, stopGameActivityWatcher } = require('./gameActivity.cjs')

const isDev = !app.isPackaged
const iconPath = path.join(__dirname, isDev ? 'tray-icon.png' : '../build/icon.png')
const trayIconPath = path.join(__dirname, 'tray-icon.png')

// Most current Linux desktops (GNOME/KDE on Wayland) run Chromium's screen
// capture through PipeWire via xdg-desktop-portal instead of the old X11
// APIs. Without this flag desktopCapturer.getSources() silently returns an
// empty list on those sessions and screen share looks broken.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer')
}

// Fixed port so the app's origin is stable across launches — the backend's
// CORS allowlist needs a known origin to match against, and a random port
// would change every time and get blocked.
const STATIC_SERVER_PORT = 47823

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

let mainWindow = null
let tray = null
let staticServer = null
app.isQuitting = false

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// Chromium refuses to fetch ES module <script> tags over the file:// scheme
// (Vite always emits type="module"), which renders as a blank window with no
// error dialog. Serving the built app over a local HTTP server sidesteps
// that restriction and also gives client-side routing (React Router) a
// normal index.html fallback for any path it doesn't recognize as a file.
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url, 'http://localhost')
      let filePath = path.join(rootDir, decodeURIComponent(requestUrl.pathname))
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403)
        res.end()
        return
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) filePath = path.join(rootDir, 'index.html')
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
      })
    })
    server.once('error', reject)
    server.listen(STATIC_SERVER_PORT, '127.0.0.1', () => resolve(server))
  })
}

// Electron does not support navigator.mediaDevices.getDisplayMedia() out of
// the box — without a main-process handler it just rejects immediately,
// which looked like screen share silently doing nothing. We proxy the
// desktopCapturer source list into the renderer (via preload.cjs) so the app
// can show its own themed picker instead of a bare OS dialog, then resolve
// the pending getDisplayMedia() call once the user picks one there.
let pendingScreenShareResolve = null

ipcMain.on('screen-share-source-chosen', (_event, sourceId) => {
  if (pendingScreenShareResolve) {
    pendingScreenShareResolve(sourceId)
    pendingScreenShareResolve = null
  }
})

function setupScreenShareHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      })
      mainWindow?.webContents.send(
        'screen-share-sources',
        sources.map((s) => ({
          id: s.id,
          name: s.name,
          thumbnail: s.thumbnail.isEmpty() ? null : s.thumbnail.toDataURL(),
        })),
      )
      const chosenId = await new Promise((resolve) => {
        pendingScreenShareResolve = resolve
      })
      const chosen = sources.find((s) => s.id === chosenId)
      callback(chosen ? { video: chosen, audio: 'loopback' } : {})
    } catch {
      callback({})
    }
  }, { useSystemPicker: false })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0f14',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium's spellchecker loads a hunspell dictionary and runs its own background
      // service per input field — real memory/CPU it doesn't need to spend for a chat app
      // that isn't relying on the native red squiggly underline for anything.
      spellcheck: false,
    },
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    if (!staticServer) staticServer = await startStaticServer(path.join(__dirname, '../dist'))
    const { port } = staticServer.address()
    void mainWindow.loadURL(`http://127.0.0.1:${port}/`)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// Auto-update via electron-updater, fed by a "generic" feed (package.json's
// "build.publish") pointing at the same S3/CloudFront `downloads/` folder the
// exe itself is uploaded to by hand — there is no GitHub Releases pipeline in
// this project, so a build is "published" simply by dragging the new
// Nebula-Setup.exe *and* the `latest.yml` electron-builder writes next to it
// (in `release/`) into that folder. Disabled in dev — there is no packaged
// latest.yml to read the update feed from, and autoUpdater throws immediately
// if it can't find one.
//
// UI lives entirely in the renderer (see UpdateBanner.tsx) rather than native
// dialogs, so every event just gets forwarded over IPC.
let manualCheckInFlight = false

function sendToRenderer(channel, payload) {
  mainWindow?.webContents.send(channel, payload)
}

function setupAutoUpdater() {
  if (isDev) return

  // Downloading only starts once the user clicks the in-app "Baixar agora"
  // button, not silently in the background the moment an update is found.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  // We never upload the .blockmap electron-updater needs for a differential
  // (delta) download — every release re-uploads the full installer by hand —
  // so force a full download every time instead of failing/falling back.
  autoUpdater.disableDifferentialDownload = true

  autoUpdater.on('error', (err) => {
    console.error('[autoUpdater]', err)
    sendToRenderer('update-error', err?.message ?? String(err))
    manualCheckInFlight = false
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-available', { version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    if (manualCheckInFlight) sendToRenderer('update-not-available')
    manualCheckInFlight = false
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-download-progress', { percent: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    manualCheckInFlight = false
    sendToRenderer('update-downloaded', { version: info.version })
  })

  // Check on launch, then every 4h while the app stays open/minimized in the tray.
  void autoUpdater.checkForUpdates()
  setInterval(() => void autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
}

function checkForUpdatesManually() {
  if (isDev) {
    console.log('[autoUpdater] verificação pulada em modo de desenvolvimento')
    return
  }
  manualCheckInFlight = true
  mainWindow?.show()
  mainWindow?.focus()
  void autoUpdater.checkForUpdates()
}

ipcMain.handle('update-download', () => autoUpdater.downloadUpdate())
ipcMain.handle('update-install', () => {
  app.isQuitting = true
  autoUpdater.quitAndInstall()
})
ipcMain.handle('update-check', () => checkForUpdatesManually())

function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(icon)
  tray.setToolTip('Nébula')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Abrir Nébula',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        },
      },
      { type: 'separator' },
      {
        label: 'Verificar atualizações',
        click: () => checkForUpdatesManually(),
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

app.whenReady().then(() => {
  setupScreenShareHandler()
  void createWindow()
  createTray()
  setupAutoUpdater()
  // Detection always runs locally (same as Discord's own client) — whether it's
  // actually sent to the backend/other people is decided in the renderer, based on the
  // user's own "compartilhar jogo" account setting (see GameActivityReporter.tsx).
  startGameActivityWatcher((activity) => sendToRenderer('game-activity-changed', activity))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    else mainWindow?.show()
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopGameActivityWatcher()
})

app.on('window-all-closed', () => {
  // keep running in the tray on Windows/Linux; mac keeps default dock behavior
  if (process.platform === 'darwin') return
})
