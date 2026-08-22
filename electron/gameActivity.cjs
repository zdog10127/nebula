const { exec } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

// "What game are you playing" activity status, detected entirely locally — same idea as
// Discord's game detection, but built from scratch here since we don't have access to
// Discord's own (much larger, telemetry-fed) detectable-games database. Two layers:
//
//   1. A curated list (games.json) of known process names -> pretty display names. This
//      is the reliable path and should cover most popular titles.
//   2. A conservative generic fallback for processes that LOOK like a game (has a
//      visible window, uses real memory, isn't a common background app) but aren't in
//      the curated list — reported simply as "um jogo" rather than guessing a name.
//
// Windows-only for now: `tasklist` is a stock Windows tool with no extra install, and
// this app's primary/tested platform is Windows. On macOS/Linux this quietly does
// nothing rather than trying to shell out to something that may not behave the same way.

const GAMES_FILE = path.join(__dirname, 'games.json')

let knownGames = {}
try {
  const raw = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'))
  // Drop the documentation-only key so it can never accidentally match a real process.
  delete raw._comment
  knownGames = raw
} catch (err) {
  console.error('[gameActivity] failed to load games.json', err)
}

// Common background apps that should never trigger the generic ("looks like a game")
// fallback, even though many of them are memory-hungry and keep a visible window open —
// browsers, IDEs, office apps, chat/communication tools, media players, our own app, OS
// shell processes, and the game-launcher clients themselves (having Steam open isn't
// the same as playing something in it).
const GENERIC_FALLBACK_DENYLIST = new Set([
  'nebula.exe', 'electron.exe',
  'chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe', 'vivaldi.exe',
  'discord.exe', 'slack.exe', 'teams.exe', 'skype.exe', 'zoom.exe', 'whatsapp.exe',
  'code.exe', 'devenv.exe', 'idea64.exe', 'pycharm64.exe', 'webstorm64.exe', 'notepad++.exe',
  'winword.exe', 'excel.exe', 'powerpnt.exe', 'outlook.exe', 'onenote.exe',
  'explorer.exe', 'searchhost.exe', 'shellexperiencehost.exe', 'textinputhost.exe', 'searchapp.exe',
  'spotify.exe', 'vlc.exe', 'obs64.exe', 'obs32.exe', 'streamlabs obs.exe',
  'steam.exe', 'epicgameslauncher.exe', 'galaxyclient.exe', 'battle.net.exe',
  'riotclientservices.exe', 'ubisoftconnect.exe', 'upc.exe', 'origin.exe', 'eadesktop.exe',
  'nvidia share.exe', 'nvcontainer.exe', 'nvidia web helper.exe', 'radeonsoftware.exe',
  'taskmgr.exe', 'cmd.exe', 'powershell.exe', 'windowsterminal.exe', 'javaw.exe',
])

// Rough magnitude filter for the generic fallback — well below what a real game uses,
// but comfortably above small background utilities that happen to have a window.
const MIN_GENERIC_MEMORY_KB = 300 * 1024

const POLL_INTERVAL_MS = 20_000

function parseTasklistCsv(output) {
  // `tasklist /v /fo csv /nh` prints one quoted-CSV row per process, no header:
  // "Image Name","PID","Session Name","Session#","Mem Usage","Status","User Name","CPU Time","Window Title"
  const rows = []
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith('"')) continue
    const fields = line.match(/"(?:[^"]|"")*"/g)
    if (!fields || fields.length < 9) continue

    const unquote = (s) => s.slice(1, -1).replace(/""/g, '"')
    const memKb = parseInt(unquote(fields[4]).replace(/[^\d]/g, ''), 10) || 0
    rows.push({ name: unquote(fields[0]), memKb, windowTitle: unquote(fields[8]) })
  }
  return rows
}

function detectActivity(rows) {
  for (const row of rows) {
    const pretty = knownGames[row.name.toLowerCase()]
    if (pretty) return pretty
  }

  for (const row of rows) {
    const lower = row.name.toLowerCase()
    if (GENERIC_FALLBACK_DENYLIST.has(lower)) continue
    if (!row.windowTitle || row.windowTitle === 'N/A') continue
    if (row.memKb < MIN_GENERIC_MEMORY_KB) continue
    return 'um jogo'
  }

  return null
}

let pollTimer = null

function startGameActivityWatcher(onChange) {
  if (process.platform !== 'win32') return

  let lastActivity = null

  const poll = () => {
    exec('tasklist /v /fo csv /nh', { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return
      const activity = detectActivity(parseTasklistCsv(stdout))
      if (activity !== lastActivity) {
        lastActivity = activity
        onChange(activity)
      }
    })
  }

  poll()
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
}

function stopGameActivityWatcher() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

module.exports = { startGameActivityWatcher, stopGameActivityWatcher }
