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
import VoiceFullscreenOverlay from '../components/VoiceFullscreenOverlay'

export interface VoiceParticipant {
  identity: string
  name: string
  avatarUrl: string | null
  micMuted: boolean
  deafened: boolean
}

export interface ScreenShareMeta {
  trackSid: string
  identity: string
  name: string
}

export type ScreenShareQuality = 'auto' | '720p' | '1080p' | '1440p'

const SCREEN_SHARE_RESOLUTIONS: Record<ScreenShareQuality, { width: number; height: number; frameRate: number } | undefined> = {
  auto: undefined,
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
  '1440p': { width: 2560, height: 1440, frameRate: 30 },
}

interface ScreenShareEntry {
  track: Track
  el: HTMLVideoElement | null
  isLocal: boolean
}

export interface VoiceCallContextValue {
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
  // Per-participant / per-stream volume
  participantVolumes: Record<string, number>
  streamVolumes: Record<string, number>
  setParticipantVolume: (identity: string, volume: number) => void
  setStreamVolume: (identity: string, volume: number) => void
  // Opt-in stream watching
  availableShares: ScreenShareMeta[]
  watchedTrackSids: Set<string>
  toggleWatchScreenShare: (trackSid: string) => void
  // Noise suppression
  isNoiseSuppressed: boolean
  toggleNoiseSuppression: () => Promise<void>
  // Device selection
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  audioInputDeviceId: string | null
  audioOutputDeviceId: string | null
  refreshDevices: () => Promise<void>
  setAudioInputDevice: (deviceId: string) => Promise<void>
  setAudioOutputDevice: (deviceId: string) => Promise<void>
  // Screen share quality
  screenShareQuality: ScreenShareQuality
  setScreenShareQuality: (quality: ScreenShareQuality) => void
  // Fullscreen
  isFullscreen: boolean
  toggleFullscreen: () => void
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

  const [participantVolumes, setParticipantVolumesState] = useState<Record<string, number>>({})
  const participantVolumesRef = useRef<Record<string, number>>({})
  const [streamVolumes, setStreamVolumesState] = useState<Record<string, number>>({})
  const streamVolumesRef = useRef<Record<string, number>>({})

  const [activeShares, setActiveSharesState] = useState<ScreenShareMeta[]>([])
  const activeSharesRef = useRef<ScreenShareMeta[]>([])
  const [watchedTrackSids, setWatchedTrackSidsState] = useState<Set<string>>(new Set())
  const watchedTrackSidsRef = useRef<Set<string>>(new Set())
  const watchedIdentitiesRef = useRef<Set<string>>(new Set())

  const [isNoiseSuppressed, setIsNoiseSuppressed] = useState(true)
  const isNoiseSuppressedRef = useRef(true)

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [audioInputDeviceId, setAudioInputDeviceIdState] = useState<string | null>(null)
  const [audioOutputDeviceId, setAudioOutputDeviceIdState] = useState<string | null>(null)
  const audioInputDeviceIdRef = useRef<string | null>(null)
  const audioOutputDeviceIdRef = useRef<string | null>(null)

  const [screenShareQuality, setScreenShareQualityState] = useState<ScreenShareQuality>('1080p')
  const screenShareQualityRef = useRef<ScreenShareQuality>('1080p')

  const [isFullscreen, setIsFullscreen] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const channelIdRef = useRef<string | null>(null)
  const audioContainerRef = useRef<HTMLDivElement | null>(null)
  const screenShareContainerRef = useRef<HTMLDivElement | null>(null)
  const screenShareTracksRef = useRef<Map<string, ScreenShareEntry>>(new Map())
  const isDeafenedRef = useRef(false)
  const locallyMutedRef = useRef<Set<string>>(new Set())

  const applyAudioElementStates = useCallback(() => {
    const container = audioContainerRef.current
    if (!container) return
    Array.from(container.children).forEach((node) => {
      const el = node as HTMLAudioElement
      const identity = el.dataset.participant ?? ''
      const isScreenAudio = el.dataset.source === 'screenAudio'
      if (isScreenAudio) {
        el.muted = isDeafenedRef.current || !watchedIdentitiesRef.current.has(identity)
        el.volume = (streamVolumesRef.current[identity] ?? 100) / 100
      } else {
        el.muted = isDeafenedRef.current || locallyMutedRef.current.has(identity)
        el.volume = (participantVolumesRef.current[identity] ?? 100) / 100
      }
    })
  }, [])

  // Updates the ref synchronously (before the React state update flushes) so that code
  // running right after this call — e.g. recomputeWatchedIdentities() — always sees the
  // fresh list, regardless of React's automatic batching of the setState call below.
  function setActiveShares(updater: (prev: ScreenShareMeta[]) => ScreenShareMeta[]) {
    const next = updater(activeSharesRef.current)
    activeSharesRef.current = next
    setActiveSharesState(next)
  }

  function recomputeWatchedIdentities() {
    const identities = new Set<string>()
    for (const share of activeSharesRef.current) {
      if (watchedTrackSidsRef.current.has(share.trackSid)) identities.add(share.identity)
    }
    watchedIdentitiesRef.current = identities
  }

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
    activeSharesRef.current = []
    setActiveSharesState([])
    watchedTrackSidsRef.current = new Set()
    setWatchedTrackSidsState(new Set())
    watchedIdentitiesRef.current = new Set()
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
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

  const enterFullscreen = useCallback(() => {
    if (document.fullscreenElement) return
    document.documentElement.requestFullscreen?.().catch(() => {
      // Best-effort: some environments deny it outside a fresh user gesture.
    })
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exitFullscreen()
    else enterFullscreen()
  }, [enterFullscreen, exitFullscreen])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
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
              const isScreenAudio = pub.source === Track.Source.ScreenShareAudio
              const el = track.attach() as HTMLAudioElement
              el.dataset.participant = participant.identity
              el.dataset.source = isScreenAudio ? 'screenAudio' : 'mic'
              audioContainerRef.current?.appendChild(el)
              applyAudioElementStates()
            } else if (track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
              screenShareTracksRef.current.set(pub.trackSid, { track, el: null, isLocal: false })
              setActiveShares((prev) => [
                ...prev,
                { trackSid: pub.trackSid, identity: participant.identity, name: participant.name || participant.identity },
              ])
            }
          },
        )
        newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication) => {
          if (pub.source === Track.Source.ScreenShare) {
            detachScreenShareTrack(pub.trackSid)
            setActiveShares((prev) => prev.filter((s) => s.trackSid !== pub.trackSid))
            watchedTrackSidsRef.current.delete(pub.trackSid)
            setWatchedTrackSidsState(new Set(watchedTrackSidsRef.current))
            recomputeWatchedIdentities()
            applyAudioElementStates()
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

        if (audioOutputDeviceIdRef.current) {
          void newRoom.switchActiveDevice('audiooutput', audioOutputDeviceIdRef.current).catch(() => {})
        }

        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true, {
            deviceId: audioInputDeviceIdRef.current ?? undefined,
            noiseSuppression: isNoiseSuppressedRef.current,
            echoCancellation: true,
            autoGainControl: true,
          })
        } catch (micErr) {
          console.warn('Could not enable microphone', micErr)
          setIsMuted(true)
          void connectionRef.current?.invoke('UpdateVoiceState', true, false)
          toast.error('Não foi possível ativar o microfone. Verifique a permissão do navegador.')
        }

        enterFullscreen()
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
    [leave, applyAudioElementStates, enterFullscreen],
  )

  const toggleMute = useCallback(async () => {
    const r = roomRef.current
    if (!r) return
    const nextMuted = !isMuted
    await r.localParticipant.setMicrophoneEnabled(!nextMuted)
    setIsMuted(nextMuted)

    let nextDeafened = isDeafened
    if (!nextMuted && isDeafened) {
      isDeafenedRef.current = false
      setIsDeafened(false)
      nextDeafened = false
      applyAudioElementStates()
      void updateOwnMetadata({ deafened: false })
    }
    void connectionRef.current?.invoke('UpdateVoiceState', nextMuted, nextDeafened)
  }, [isMuted, isDeafened, applyAudioElementStates])

  const toggleDeafen = useCallback(async () => {
    const r = roomRef.current
    if (!r) return
    const next = !isDeafened
    isDeafenedRef.current = next
    setIsDeafened(next)
    applyAudioElementStates()
    void updateOwnMetadata({ deafened: next })

    let nextMuted = isMuted
    if (next && !isMuted) {
      await r.localParticipant.setMicrophoneEnabled(false)
      setIsMuted(true)
      nextMuted = true
    }
    void connectionRef.current?.invoke('UpdateVoiceState', nextMuted, next)
  }, [isDeafened, isMuted, applyAudioElementStates])

  const toggleParticipantMute = useCallback(
    (identity: string) => {
      const next = new Set(locallyMutedRef.current)
      if (next.has(identity)) next.delete(identity)
      else next.add(identity)
      locallyMutedRef.current = next
      setLocallyMutedIds(next)
      applyAudioElementStates()
    },
    [applyAudioElementStates],
  )

  const setParticipantVolume = useCallback(
    (identity: string, volume: number) => {
      const clamped = Math.max(0, Math.min(200, Math.round(volume)))
      const next = { ...participantVolumesRef.current, [identity]: clamped }
      participantVolumesRef.current = next
      setParticipantVolumesState(next)
      applyAudioElementStates()
    },
    [applyAudioElementStates],
  )

  const setStreamVolume = useCallback(
    (identity: string, volume: number) => {
      const clamped = Math.max(0, Math.min(200, Math.round(volume)))
      const next = { ...streamVolumesRef.current, [identity]: clamped }
      streamVolumesRef.current = next
      setStreamVolumesState(next)
      applyAudioElementStates()
    },
    [applyAudioElementStates],
  )

  const toggleWatchScreenShare = useCallback(
    (trackSid: string) => {
      const entry = screenShareTracksRef.current.get(trackSid)
      if (!entry) return
      const isWatching = watchedTrackSidsRef.current.has(trackSid)
      const nextSids = new Set(watchedTrackSidsRef.current)
      if (isWatching) {
        nextSids.delete(trackSid)
        if (entry.el) {
          entry.track.detach(entry.el)
          entry.el.remove()
          entry.el = null
        }
      } else {
        nextSids.add(trackSid)
        const container = screenShareContainerRef.current
        if (container) {
          const el = entry.track.attach() as HTMLVideoElement
          el.className = screenShareClassName(false)
          container.appendChild(el)
          entry.el = el
        }
      }
      watchedTrackSidsRef.current = nextSids
      setWatchedTrackSidsState(nextSids)
      recomputeWatchedIdentities()
      applyAudioElementStates()
    },
    [applyAudioElementStates],
  )

  const refreshDevices = useCallback(async () => {
    try {
      const [inputs, outputs] = await Promise.all([Room.getLocalDevices('audioinput'), Room.getLocalDevices('audiooutput')])
      setAudioInputDevices(inputs)
      setAudioOutputDevices(outputs)
    } catch (err) {
      console.warn('Could not list audio devices', err)
    }
  }, [])

  useEffect(() => {
    void refreshDevices()
    const handler = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler)
  }, [refreshDevices])

  const setAudioInputDevice = useCallback(
    async (deviceId: string) => {
      audioInputDeviceIdRef.current = deviceId || null
      setAudioInputDeviceIdState(deviceId || null)
      const r = roomRef.current
      if (!r) return
      try {
        await r.switchActiveDevice('audioinput', deviceId)
      } catch (err) {
        console.warn('Could not switch audio input device', err)
        toast.error('Não foi possível trocar o microfone.')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const setAudioOutputDevice = useCallback(
    async (deviceId: string) => {
      audioOutputDeviceIdRef.current = deviceId || null
      setAudioOutputDeviceIdState(deviceId || null)
      const r = roomRef.current
      if (!r) return
      try {
        await r.switchActiveDevice('audiooutput', deviceId)
      } catch (err) {
        console.warn('Could not switch audio output device', err)
        toast.error('Não foi possível trocar a saída de áudio.')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const toggleNoiseSuppression = useCallback(async () => {
    const next = !isNoiseSuppressedRef.current
    isNoiseSuppressedRef.current = next
    setIsNoiseSuppressed(next)
    const r = roomRef.current
    if (!r || isMuted) return
    try {
      await r.localParticipant.setMicrophoneEnabled(false)
      await r.localParticipant.setMicrophoneEnabled(true, {
        deviceId: audioInputDeviceIdRef.current ?? undefined,
        noiseSuppression: next,
        echoCancellation: true,
        autoGainControl: true,
      })
    } catch (err) {
      console.warn('Could not toggle noise suppression', err)
      toast.error('Não foi possível ajustar a redução de ruído.')
    }
  }, [isMuted, toast])

  const setScreenShareQuality = useCallback((quality: ScreenShareQuality) => {
    screenShareQualityRef.current = quality
    setScreenShareQualityState(quality)
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
        const resolution = SCREEN_SHARE_RESOLUTIONS[screenShareQualityRef.current]
        const publication = await r.localParticipant.setScreenShareEnabled(
          true,
          { audio: true, contentHint: 'detail', ...(resolution ? { resolution } : {}) },
          { videoEncoding: { maxBitrate: 6_000_000, maxFramerate: 30 }, simulcast: false },
        )
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
        participantVolumes,
        streamVolumes,
        setParticipantVolume,
        setStreamVolume,
        availableShares: activeShares,
        watchedTrackSids,
        toggleWatchScreenShare,
        isNoiseSuppressed,
        toggleNoiseSuppression,
        audioInputDevices,
        audioOutputDevices,
        audioInputDeviceId,
        audioOutputDeviceId,
        refreshDevices,
        setAudioInputDevice,
        setAudioOutputDevice,
        screenShareQuality,
        setScreenShareQuality,
        isFullscreen,
        toggleFullscreen,
      }}
    >
      {children}
      <div ref={audioContainerRef} style={{ display: 'none' }} />
      {screenShareSources && (
        <ScreenSharePickerModal sources={screenShareSources} onChoose={chooseScreenShareSource} />
      )}
      <VoiceFullscreenOverlay />
    </VoiceCallContext.Provider>
  )
}

export function useVoiceCall(): VoiceCallContextValue {
  const ctx = useContext(VoiceCallContext)
  if (!ctx) throw new Error('useVoiceCall must be used within VoiceCallProvider')
  return ctx
}
