import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isHubConnected, useChatHub } from '../hubs/ChatHubContext'

// Bridges the Electron main process's local game-detection (see electron/gameActivity.cjs)
// into the chat hub, so other people see "Jogando X" the same way Discord shows it.
// Renders nothing. A no-op outside Electron (window.electronGameActivity is undefined in
// the browser build). Detection itself always runs in the main process regardless of the
// user's setting — only the *broadcast* is gated here by shareActivityStatus, mirroring
// how the toggle is described in account settings ("share what I'm playing").
export default function GameActivityReporter() {
  const { user } = useAuth()
  const connection = useChatHub()
  const lastActivityRef = useRef<string | null>(null)
  const canShare = isHubConnected(connection) && !!user?.shareActivityStatus

  const push = useCallback(
    (activity: string | null) => {
      if (!canShare || !connection) return
      connection.invoke('SetActivity', activity).catch(() => {
        // best-effort — a transient hub hiccup just leaves the status stale for a moment
      })
    },
    [canShare, connection],
  )

  useEffect(() => {
    if (!window.electronGameActivity) return
    return window.electronGameActivity.onChange((activity) => {
      lastActivityRef.current = activity
      push(activity)
    })
  }, [push])

  // Re-announce whatever was last detected whenever sharing becomes possible again —
  // the hub reconnecting after a network hiccup, or the setting being turned back on.
  // The server clears activity on a full disconnect (see PresenceService.DisconnectAsync),
  // so without this a reconnect would silently stay "activity: none" until the next
  // change is actually detected.
  useEffect(() => {
    if (canShare) push(lastActivityRef.current)
  }, [canShare, push])

  return null
}
