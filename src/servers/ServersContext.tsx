import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet } from '../api/client'
import type { ServerSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface ServersContextValue {
  servers: ServerSummary[]
  isLoading: boolean
  refresh: () => Promise<void>
  // Per-user, client-side "silenciar servidor" — just stops notification popups for that
  // server, doesn't touch the backend. Persisted to localStorage so it survives reloads.
  mutedServerIds: Set<string>
  isServerMuted: (serverId: string) => boolean
  toggleServerMute: (serverId: string) => void
}

const ServersContext = createContext<ServersContextValue | null>(null)

function mutedServersStorageKey(userId: string): string {
  return `nebula:mutedServers:${userId}`
}

export function ServersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [servers, setServers] = useState<ServerSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mutedServerIds, setMutedServerIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!user) {
      setServers([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const list = await apiGet<ServerSummary[]>('/api/servers')
      setServers(list)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) {
      setMutedServerIds(new Set())
      return
    }
    try {
      const raw = localStorage.getItem(mutedServersStorageKey(user.userId))
      setMutedServerIds(raw ? new Set(JSON.parse(raw) as string[]) : new Set())
    } catch {
      setMutedServerIds(new Set())
    }
  }, [user])

  const toggleServerMute = useCallback(
    (serverId: string) => {
      if (!user) return
      setMutedServerIds((prev) => {
        const next = new Set(prev)
        if (next.has(serverId)) next.delete(serverId)
        else next.add(serverId)
        try {
          localStorage.setItem(mutedServersStorageKey(user.userId), JSON.stringify(Array.from(next)))
        } catch {
          // localStorage unavailable/full — mute state just won't survive a reload
        }
        return next
      })
    },
    [user],
  )

  const isServerMuted = useCallback((serverId: string) => mutedServerIds.has(serverId), [mutedServerIds])

  return (
    <ServersContext.Provider value={{ servers, isLoading, refresh, mutedServerIds, isServerMuted, toggleServerMute }}>
      {children}
    </ServersContext.Provider>
  )
}

export function useServers(): ServersContextValue {
  const ctx = useContext(ServersContext)
  if (!ctx) throw new Error('useServers must be used within ServersProvider')
  return ctx
}
