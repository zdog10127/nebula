const { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, desktopCapturer, ipcMain, dialog } = require('electron')
const path = require('node:path')
const http = require('node:http')
const fs = require('node:fs')
const { URL } = require('node:url')
const { autoUpdater } = require('electron-updater')

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

// Auto-update via electron-updater, fed by GitHub Releases (see package.json's
// "build.publish" and .github/workflows/release.yml). Disabled in dev — there
// is no packaged app.yml/latest.yml to read the update feed from, and
// autoUpdater throws immediately if it can't find one.
let manualCheckInFlight = false

function setupAutoUpdater() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => {
    console.error('[autoUpdater]', err)
    if (manualCheckInFlight) {
      manualCheckInFlight = false
      void dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Nébula',
        message: 'Não foi possível verificar atualizações.',
        detail: err?.message ?? String(err),
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    if (manualCheckInFlight) {
      manualCheckInFlight = false
      void dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Nébula',
        message: 'Você já está na versão mais recente.',
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    manualCheckInFlight = false
    void dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Nébula',
        message: `Atualização ${info.version} baixada.`,
        detail: 'Reinicie o app para aplicar a atualização.',
        buttons: ['Reiniciar agora', 'Mais tarde'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          app.isQuitting = true
          autoUpdater.quitAndInstall()
        }
      })
  })

  // Check on launch, then every 4h while the app stays open/minimized in the tray.
  void autoUpdater.checkForUpdates()
  setInterval(() => void autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
}

function checkForUpdatesManually() {
  if (isDev) {
    void dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Nébula',
      message: 'Verificação de atualização não está disponível em modo de desenvolvimento.',
    })
    return
  }
  manualCheckInFlight = true
  void autoUpdater.checkForUpdates()
}

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    else mainWindow?.show()
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  // keep running in the tray on Windows/Linux; mac keeps default dock behavior
  if (process.platform === 'darwin') return
})
