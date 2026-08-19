import { Room, RoomEvent, Track } from 'livekit-client'
import type { Participant, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from 'livekit-client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, apiPost } from '../api/client'
import type { NowPlayingDto, NowPlayingType, VoiceTokenResult } from '../api/types'
import type { ElectronScreenShareSource } from '../electron'
import { useChatHub } from '../hubs/ChatHubContext'
import { useToast } from '../lib/ToastContext'
import ScreenSharePickerModal from '../components/ScreenSharePickerModal'

export interface VoiceParticipant {
  identity: string
  name: string
  avatarUrl: string | null
  micMuted: boolean
  deafened: boolean
}

interface ScreenShareEntry {
  track: Track
  el: HTMLVideoElement | null
  isLocal: boolean
}

interface VoiceCallContextValue {
  channelId: string | null
  channelName: string | null
  participants: VoiceParticipant[]
  speakingIds: Set<string>
  locallyMutedIds: Set<string>
  isMuted: boolean
  isDeafened: boolean
  isSharingScreen: boolean
  isConnecting: boolean
  error: string | null
  nowPlaying: NowPlayingDto | null
  isMusicMuted: boolean
  join: (channelId: string, channelName: string) => Promise<void>
  leave: () => Promise<void>
  toggleMute: () => Promise<void>
  toggleDeafen: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  toggleParticipantMute: (identity: string) => void
  toggleMusicMute: () => void
  registerScreenShareContainer: (el: HTMLDivElement | null) => void
  shareNowPlaying: (type: NowPlayingType, url: string, title?: string) => Promise<void>
  stopNowPlaying: () => Promise<void>
}

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null)

interface ParticipantMetadata {
  avatarUrl: string | null
  deafened: boolean
}

function parseMetadata(raw: string | undefined): ParticipantMetadata {
  try {
    const meta = raw ? JSON.parse(raw) : null
    return { avatarUrl: meta?.avatarUrl ?? null, deafened: meta?.deafened ?? false }
  } catch {
    return { avatarUrl: null, deafened: false }
  }
}

function screenShareClassName(isLocal: boolean): string {
  return isLocal
    ? 'max-h-[50vh] max-w-full rounded-xl border-2 border-accent'
    : 'max-h-[50vh] max-w-full rounded-xl border border-border'
}

export function VoiceCallProvider({ children }: { children: ReactNode }) {
  const connection = useChatHub()
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const toast = useToast()

  const [channelId, setChannelId] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set())
  const [locallyMutedIds, setLocallyMutedIds] = useState<Set<string>>(new Set())
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingDto | null>(null)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [screenShareSources, setScreenShareSources] = useState<ElectronScreenShareSource[] | null>(null)

  const roomRef = useRef<Room | null>(null)
  const channelIdRef = useRef<string | null>(null)
  const audioContainerRef = useRef<HTMLDivElement | null>(null)
  const screenShareContainerRef = useRef<HTMLDivElement | null>(null)
  const screenShareTracksRef = useRef<Map<string, ScreenShareEntry>>(new Map())
  const isDeafenedRef = useRef(false)
  const locallyMutedRef = useRef<Set<string>>(new Set())

  function attachScreenShareTrack(key: string, track: Track, isLocal: boolean) {
    screenShareTracksRef.current.set(key, { track, el: null, isLocal })
    const container = screenShareContainerRef.current
    if (!container) return
    const el = track.attach() as HTMLVideoElement
    el.className = screenShareClassName(isLocal)
    if (isLocal) el.muted = true
    container.appendChild(el)
    const entry = screenShareTracksRef.current.get(key)
    if (entry) entry.el = el
  }

  function detachScreenShareTrack(key: string) {
    const entry = screenShareTracksRef.current.get(key)
    if (entry?.el) {
      entry.track.detach(entry.el)
      entry.el.remove()
    }
    screenShareTracksRef.current.delete(key)
  }

  function updateParticipants(r: Room) {
    const toEntry = (p: Participant): VoiceParticipant => {
      const meta = parseMetadata(p.metadata)
      return {
        identity: p.identity,
        name: p.name || p.identity,
        avatarUrl: meta.avatarUrl,
        micMuted: !p.isMicrophoneEnabled,
        deafened: meta.deafened,
      }
    }
    setParticipants([toEntry(r.localParticipant), ...Array.from(r.remoteParticipants.values()).map(toEntry)])
  }

  async function updateOwnMetadata(patch: Partial<ParticipantMetadata>) {
    const r = roomRef.current
    if (!r) return
    const current = parseMetadata(r.localParticipant.metadata)
    try {
      await r.localParticipant.setMetadata(JSON.stringify({ ...current, ...patch }))
      updateParticipants(r)
    } catch (err) {
      console.warn('Could not update own metadata', err)
    }
  }

  function setAllRemoteAudioMuted(muted: boolean) {
    if (!audioContainerRef.current) return
    Array.from(audioContainerRef.current.children).forEach((el) => {
      const audioEl = el as HTMLAudioElement
      // Undeafening restores each participant's own local-mute state instead of unmuting everyone.
      audioEl.muted = muted || locallyMutedRef.current.has(audioEl.dataset.participant ?? '')
    })
  }

  function resetState() {
    roomRef.current = null
    channelIdRef.current = null
    setChannelId(null)
    setChannelName(null)
    setParticipants([])
    setSpeakingIds(new Set())
    setIsMuted(false)
    setIsDeafened(false)
    setIsSharingScreen(false)
    setNowPlaying(null)
    isDeafenedRef.current = false
    locallyMutedRef.current = new Set()
    setLocallyMutedIds(new Set())
    for (const key of Array.from(screenShareTracksRef.current.keys())) detachScreenShareTrack(key)
    if (audioContainerRef.current) audioContainerRef.current.innerHTML = ''
  }

  const registerScreenShareContainer = useCallback((el: HTMLDivElement | null) => {
    if (!el) {
      screenShareContainerRef.current = null
      for (const entry of screenShareTracksRef.current.values()) {
        if (entry.el) {
          entry.track.detach(entry.el)
          entry.el.remove()
          entry.el = null
        }
      }
      return
    }
    screenShareContainerRef.current = el
    for (const entry of screenShareTracksRef.current.values()) {
      const attachedEl = entry.track.attach() as HTMLVideoElement
      attachedEl.className = screenShareClassName(entry.isLocal)
      if (entry.isLocal) attachedEl.muted = true
      el.appendChild(attachedEl)
      entry.el = attachedEl
    }
  }, [])

  const leave = useCallback(async () => {
    const r = roomRef.current
    const cid = channelIdRef.current
    if (!r) return
    if (cid) void connectionRef.current?.invoke('LeaveVoiceChannel', cid)
    await r.disconnect()
  }, [])

  const join = useCallback(
    async (newChannelId: string, newChannelName: string) => {
      if (channelIdRef.current === newChannelId) return
      if (roomRef.current) await leave()

      setError(null)
      setIsConnecting(true)
      channelIdRef.current = newChannelId
      setChannelId(newChannelId)
      setChannelName(newChannelName)

      try {
        const { url, token } = await apiPost<VoiceTokenResult>(`/api/channels/${newChannelId}/voice/token`)
        const newRoom = new Room()

        newRoom.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach()
              el.dataset.participant = participant.identity
              el.muted = isDeafenedRef.current || locallyMutedRef.current.has(participant.identity)
              audioContainerRef.current?.appendChild(el)
            } else if (track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
              attachScreenShareTrack(pub.trackSid, track, false)
            }
          },
        )
        newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication) => {
          if (pub.source === Track.Source.ScreenShare) {
            detachScreenShareTrack(pub.trackSid)
          } else {
            track.detach().forEach((el) => el.remove())
          }
        })
        newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            detachScreenShareTrack(publication.trackSid)
            setIsSharingScreen(false)
          }
        })
        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          setSpeakingIds(new Set(speakers.map((s) => s.identity)))
        })
        newRoom.on(RoomEvent.ParticipantConnected, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.TrackMuted, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.TrackUnmuted, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.ParticipantMetadataChanged, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.Disconnected, () => {
          resetState()
        })

        await newRoom.connect(url, token)
        roomRef.current = newRoom
        updateParticipants(newRoom)
        void connectionRef.current?.invoke('JoinVoiceChannel', newChannelId)
        void apiGet<NowPlayingDto | null>(`/api/channels/${newChannelId}/voice/now-playing`)
          .then((np) => {
            if (channelIdRef.current === newChannelId) setNowPlaying(np)
          })
          .catch(() => {})

        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true)
        } catch (micErr) {
          console.warn('Could not enable microphone', micErr)
          setIsMuted(true)
          void connectionRef.current?.invoke('UpdateVoiceState', true, false)
          toast.error('Não foi possível ativar o microfone. Verifique a permissão do navegador.')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao entrar no canal de voz.'
        setError(message)
        toast.error(message)
        channelIdRef.current = null
        setChannelId(null)
        setChannelName(null)
      } finally {
        setIsConnecting(false)
      }
    },
    // toast's functions are stable regardless of the object identity react-hooks flags here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leave],
  )

  const toggleMute = useCallback(async () => {
    const r = roomRef.current
    if (!r) return
    const nextMuted = !isMuted
    await r.localParticipant.setMicrophoneEnabled(!nextMuted)
    setIsMuted(nextMuted)

    let nextDeafened = isDeafened
    if (!nextMuted && isDeafened) {
      setAllRemoteAudioMuted(false)
      isDeafenedRef.current = false
      setIsDeafened(false)
      nextDeafened = false
      void updateOwnMetadata({ deafened: false })
    }
    void connectionRef.current?.invoke('UpdateVoiceState', nextMuted, nextDeafened)
  }, [isMuted, isDeafened])

  const toggleDeafen = useCallback(async () => {
    const r = roomRef.current
    if (!r) return
    const next = !isDeafened
    isDeafenedRef.current = next
    setIsDeafened(next)
    setAllRemoteAudioMuted(next)
    void updateOwnMetadata({ deafened: next })

    let nextMuted = isMuted
    if (next && !isMuted) {
      await r.localParticipant.setMicrophoneEnabled(false)
      setIsMuted(true)
      nextMuted = true
    }
    void connectionRef.current?.invoke('UpdateVoiceState', nextMuted, next)
  }, [isDeafened, isMuted])

  const toggleParticipantMute = useCallback((identity: string) => {
    const next = new Set(locallyMutedRef.current)
    if (next.has(identity)) next.delete(identity)
    else next.add(identity)
    locallyMutedRef.current = next
    setLocallyMutedIds(next)

    if (!audioContainerRef.current) return
    Array.from(audioContainerRef.current.children).forEach((el) => {
      const audioEl = el as HTMLAudioElement
      if (audioEl.dataset.participant === identity) {
        audioEl.muted = isDeafenedRef.current || next.has(identity)
      }
    })
  }, [])

  useEffect(() => {
    return window.electronScreenShare?.onSources((sources) => setScreenShareSources(sources))
  }, [])

  const chooseScreenShareSource = useCallback((sourceId: string | null) => {
    window.electronScreenShare?.choose(sourceId)
    setScreenShareSources(null)
  }, [])

  const toggleScreenShare = useCallback(async () => {
    const r = roomRef.current
    if (!r) return
    try {
      if (!isSharingScreen) {
        const publication = await r.localParticipant.setScreenShareEnabled(true, { audio: true })
        if (publication?.videoTrack) attachScreenShareTrack(publication.trackSid, publication.videoTrack, true)
        setIsSharingScreen(true)
      } else {
        await r.localParticipant.setScreenShareEnabled(false)
        setIsSharingScreen(false)
      }
    } catch (err) {
      console.warn('Could not toggle screen share', err)
      toast.error('Não foi possível compartilhar a tela.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharingScreen])

  const shareNowPlaying = useCallback(async (type: NowPlayingType, url: string, title?: string) => {
    const cid = channelIdRef.current
    if (!cid) return
    try {
      await connectionRef.current?.invoke('ShareNowPlaying', cid, type, url, title ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao compartilhar música.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopNowPlaying = useCallback(async () => {
    const cid = channelIdRef.current
    if (!cid) return
    try {
      await connectionRef.current?.invoke('StopNowPlaying', cid)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao parar a música.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!connection) return
    const handler = (changedChannelId: string, dto: NowPlayingDto | null) => {
      if (channelIdRef.current === changedChannelId) {
        setNowPlaying(dto)
        setIsMusicMuted(false)
      }
    }
    connection.on('NowPlayingChanged', handler)
    return () => {
      connection.off('NowPlayingChanged', handler)
    }
  }, [connection])

  const toggleMusicMute = useCallback(() => {
    setIsMusicMuted((v) => !v)
  }, [])

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect()
    }
  }, [])

  return (
    <VoiceCallContext.Provider
      value={{
        channelId,
        channelName,
        participants,
        speakingIds,
        locallyMutedIds,
        isMuted,
        isDeafened,
        isSharingScreen,
        isConnecting,
        error,
        nowPlaying,
        isMusicMuted,
        join,
        leave,
        toggleMute,
        toggleDeafen,
        toggleScreenShare,
        toggleParticipantMute,
        toggleMusicMute,
        registerScreenShareContainer,
        shareNowPlaying,
        stopNowPlaying,
      }}
    >
      {children}
      <div ref={audioContainerRef} style={{ display: 'none' }} />
      {screenShareSources && (
        <ScreenSharePickerModal sources={screenShareSources} onChoose={chooseScreenShareSource} />
      )}
    </VoiceCallContext.Provider>
  )
}

export function useVoiceCall(): VoiceCallContextValue {
  const ctx = useContext(VoiceCallContext)
  if (!ctx) throw new Error('useVoiceCall must be used within VoiceCallProvider')
  return ctx
}
