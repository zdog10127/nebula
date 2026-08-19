import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet } from '../api/client'
import type { ServerSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface ServersContextValue {
  servers: ServerSummary[]
  isLoading: boolean
  refresh: () => Promise<void>
}

const ServersContext = createContext<ServersContextValue | null>(null)

export function ServersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [servers, setServers] = useState<ServerSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  return <ServersContext.Provider value={{ servers, isLoading, refresh }}>{children}</ServersContext.Provider>
}

export function useServers(): ServersContextValue {
  const ctx = useContext(ServersContext)
  if (!ctx) throw new Error('useServers must be used within ServersProvider')
  return ctx
}
