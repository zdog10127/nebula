import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiDelete, apiGet, apiPost } from '../api/client'
import type { DmChannelDto, DmMessageDto, FriendDto, FriendRequestDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isHubConnected, useChatHub } from '../hubs/ChatHubContext'

interface SocialContextValue {
  friends: FriendDto[]
  friendRequests: FriendRequestDto[]
  incomingRequestCount: number
  dmChannels: DmChannelDto[]
  refresh: () => Promise<void>
  sendFriendRequest: (username: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  declineFriendRequest: (requestId: string) => Promise<void>
  cancelFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
  getOrCreateDmChannel: (userId: string) => Promise<DmChannelDto>
}

const SocialContext = createContext<SocialContextValue | null>(null)

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const connection = useChatHub()
  const [friends, setFriends] = useState<FriendDto[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequestDto[]>([])
  const [dmChannels, setDmChannels] = useState<DmChannelDto[]>([])

  const refresh = useCallback(async () => {
    if (!user) return
    const [f, r, d] = await Promise.all([
      apiGet<FriendDto[]>('/api/friends'),
      apiGet<FriendRequestDto[]>('/api/friends/requests'),
      apiGet<DmChannelDto[]>('/api/dm/channels'),
    ])
    setFriends(f)
    setFriendRequests(r)
    setDmChannels(d)
  }, [user])

  useEffect(() => {
    if (!user) {
      setFriends([])
      setFriendRequests([])
      setDmChannels([])
      return
    }
    void refresh()
  }, [user, refresh])

  useEffect(() => {
    if (!connection || !isHubConnected(connection)) return

    const onChanged = () => void refresh()
    const onDmMessage = (message: DmMessageDto) => {
      setDmChannels((prev) => {
        const idx = prev.findIndex((c) => c.id === message.dmChannelId)
        if (idx === -1) {
          void refresh()
          return prev
        }
        const updated = { ...prev[idx], lastMessageContent: message.content, lastMessageAt: message.createdAt }
        const next = prev.filter((c) => c.id !== message.dmChannelId)
        return [updated, ...next]
      })
    }

    connection.on('FriendRequestReceived', onChanged)
    connection.on('FriendRequestAccepted', onChanged)
    connection.on('FriendRequestDeclined', onChanged)
    connection.on('FriendRemoved', onChanged)
    connection.on('DmMessageReceived', onDmMessage)

    return () => {
      connection.off('FriendRequestReceived', onChanged)
      connection.off('FriendRequestAccepted', onChanged)
      connection.off('FriendRequestDeclined', onChanged)
      connection.off('FriendRemoved', onChanged)
      connection.off('DmMessageReceived', onDmMessage)
    }
  }, [connection, refresh])

  const sendFriendRequest = useCallback(
    async (username: string) => {
      await apiPost('/api/friends/requests', { username })
      await refresh()
    },
    [refresh],
  )

  const acceptFriendRequest = useCallback(
    async (requestId: string) => {
      await apiPost(`/api/friends/requests/${requestId}/accept`)
      await refresh()
    },
    [refresh],
  )

  const declineFriendRequest = useCallback(
    async (requestId: string) => {
      await apiPost(`/api/friends/requests/${requestId}/decline`)
      await refresh()
    },
    [refresh],
  )

  const cancelFriendRequest = useCallback(
    async (requestId: string) => {
      await apiDelete(`/api/friends/requests/${requestId}`)
      await refresh()
    },
    [refresh],
  )

  const removeFriend = useCallback(
    async (userId: string) => {
      await apiDelete(`/api/friends/${userId}`)
      await refresh()
    },
    [refresh],
  )

  const getOrCreateDmChannel = useCallback(
    async (userId: string) => {
      const channel = await apiPost<DmChannelDto>('/api/dm/channels', { userId })
      await refresh()
      return channel
    },
    [refresh],
  )

  const incomingRequestCount = friendRequests.filter((r) => r.isIncoming).length

  return (
    <SocialContext.Provider
      value={{
        friends,
        friendRequests,
        incomingRequestCount,
        dmChannels,
        refresh,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        cancelFriendRequest,
        removeFriend,
        getOrCreateDmChannel,
      }}
    >
      {children}
    </SocialContext.Provider>
  )
}

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext)
  if (!ctx) throw new Error('useSocial must be used within SocialProvider')
  return ctx
}
