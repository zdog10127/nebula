import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API_URL } from '../api/client'
import { getAccessToken } from '../api/tokenStore'
import { useAuth } from '../auth/AuthContext'

const ChatHubContext = createContext<HubConnection | null>(null)

export function ChatHubProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [connection, setConnection] = useState<HubConnection | null>(null)

  useEffect(() => {
    if (!user) {
      setConnection(null)
      return
    }

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/chat`, { accessTokenFactory: () => getAccessToken() ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    conn
      .start()
      .then(() => setConnection(conn))
      .catch((err: unknown) => console.error('Failed to connect to chat hub', err))

    return () => {
      void conn.stop()
      setConnection(null)
    }
  }, [user])

  return <ChatHubContext.Provider value={connection}>{children}</ChatHubContext.Provider>
}

export function useChatHub(): HubConnection | null {
  return useContext(ChatHubContext)
}

export function isHubConnected(connection: HubConnection | null): boolean {
  return connection?.state === HubConnectionState.Connected
}
