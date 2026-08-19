import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { apiGet } from '../api/client'
import type { ServerDetail } from '../api/types'
import ChannelSidebar from '../components/ChannelSidebar'

export interface ServerOutletContext {
  server: ServerDetail
  refreshServer: () => Promise<void>
}

export default function ServerView() {
  const { serverId } = useParams<{ serverId: string }>()
  const [server, setServer] = useState<ServerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshServer = useCallback(async () => {
    if (!serverId) return
    const detail = await apiGet<ServerDetail>(`/api/servers/${serverId}`)
    setServer(detail)
  }, [serverId])

  useEffect(() => {
    setIsLoading(true)
    void refreshServer().finally(() => setIsLoading(false))
  }, [refreshServer])

  if (isLoading) return <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">Carregando...</div>
  if (!server) return <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">Server não encontrado.</div>

  return (
    <>
      <ChannelSidebar server={server} refreshServer={refreshServer} />
      {server.channels.length > 0 ? (
        <Outlet context={{ server, refreshServer } satisfies ServerOutletContext} />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">
          Este server ainda não tem canais.
        </div>
      )}
    </>
  )
}

export function ServerIndexRedirect() {
  const { serverId } = useParams<{ serverId: string }>()
  const [firstChannelId, setFirstChannelId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void apiGet<ServerDetail>(`/api/servers/${serverId}`).then((detail) => {
      if (!cancelled) setFirstChannelId(detail.channels[0]?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [serverId])

  if (firstChannelId === undefined)
    return <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">Carregando...</div>
  if (firstChannelId === null)
    return (
      <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">
        Este server ainda não tem canais.
      </div>
    )
  return <Navigate to={`/app/servers/${serverId}/channels/${firstChannelId}`} replace />
}
