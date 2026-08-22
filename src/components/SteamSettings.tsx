import { Link2, Unlink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, apiPost } from '../api/client'
import type { SteamLinkStartResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../lib/ToastContext'

// Opt-in Steam account link, embedded in ProfileSettingsModal next to the game-activity
// toggle. Linking happens on steamcommunity.com, outside our own window — main.cjs's
// setWindowOpenHandler already routes window.open() to the system browser in the
// Electron build, and it's a normal new tab on the web build, so no extra IPC bridge is
// needed here. There's no redirect back into the app to catch: instead, once the user
// finishes on Steam's side and comes back to this window/tab, the "focus" listener below
// refreshes the profile so the "vinculado" state shows up without the user having to do
// anything else.
export default function SteamSettings() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const [isBusy, setIsBusy] = useState(false)
  const isWaitingForReturn = useRef(false)

  useEffect(() => {
    function onFocus() {
      if (!isWaitingForReturn.current) return
      isWaitingForReturn.current = false
      void refreshProfile()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshProfile])

  async function startLink() {
    setIsBusy(true)
    try {
      const result = await apiPost<SteamLinkStartResult>('/api/auth/steam/link-start')
      isWaitingForReturn.current = true
      window.open(result.redirectUrl, '_blank')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao iniciar a vinculação com a Steam.')
    } finally {
      setIsBusy(false)
    }
  }

  async function unlink() {
    setIsBusy(true)
    try {
      await apiPost('/api/auth/steam/unlink')
      await refreshProfile()
      toast.success('Conta Steam desvinculada.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao desvincular.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-raised p-3">
      <div className="flex items-center gap-2 text-sm text-foreground">
        {user?.steamLinked ? (
          <Link2 size={16} className="text-accent" />
        ) : (
          <Unlink size={16} className="text-muted-foreground" />
        )}
        Conta Steam{user?.steamLinked ? ' (vinculada)' : ''}
      </div>
      {user?.steamLinked ? (
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => void unlink()} disabled={isBusy}>
          Desvincular
        </button>
      ) : (
        <button type="button" className="btn btn-secondary shrink-0" onClick={() => void startLink()} disabled={isBusy}>
          <Link2 size={14} className="mr-1 inline" />
          Vincular
        </button>
      )}
    </div>
  )
}
