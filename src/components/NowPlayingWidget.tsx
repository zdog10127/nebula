import { Music, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { NowPlayingDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { loadYoutubeIframeApi } from '../lib/youtubePlayer'
import { useVoiceCall } from '../voice/VoiceCallContext'

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1] ?? null
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1] ?? null
      if (u.pathname.startsWith('/live/')) return u.pathname.split('/live/')[1] ?? null
    }
    return null
  } catch {
    return null
  }
}

function elapsedSeconds(startedAtUnixMs: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAtUnixMs) / 1000))
}

// Renders a compact "music bot" card — no visible video, audio only — for whatever is
// currently playing in the voice room.
export default function NowPlayingWidget({ nowPlaying }: { nowPlaying: NowPlayingDto }) {
  const { user } = useAuth()
  const call = useVoiceCall()
  const audioRef = useRef<HTMLAudioElement>(null)
  const youtubeMountRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<YT.Player | null>(null)
  const isSharer = nowPlaying.sharedByUserId === user?.userId
  const youtubeId = nowPlaying.type === 'youtube' ? extractYoutubeId(nowPlaying.url) : null

  // MP3 upload playback — unchanged, this path was never buggy.
  useEffect(() => {
    if (nowPlaying.type !== 'audio') return
    const el = audioRef.current
    if (!el) return
    function onLoaded() {
      if (!el) return
      el.currentTime = elapsedSeconds(nowPlaying.startedAtUnixMs)
      void el.play().catch(() => {})
    }
    el.addEventListener('loadedmetadata', onLoaded)
    return () => el.removeEventListener('loadedmetadata', onLoaded)
  }, [nowPlaying])

  useEffect(() => {
    if (nowPlaying.type === 'audio' && audioRef.current) audioRef.current.muted = call.isMusicMuted
  }, [call.isMusicMuted, nowPlaying.type])

  // YouTube playback via the IFrame Player API, created once per video and controlled
  // imperatively from then on (mute/unmute/seek). The old version keyed a raw <iframe> on
  // call.isMusicMuted, which forced a full reload on every mute toggle — that was the
  // "toca e trava" freeze bug. This effect intentionally does NOT depend on isMusicMuted.
  useEffect(() => {
    if (nowPlaying.type !== 'youtube' || !youtubeId) return
    let cancelled = false
    let player: YT.Player | null = null

    void loadYoutubeIframeApi().then((ytApi) => {
      if (cancelled || !youtubeMountRef.current) return
      player = new ytApi.Player(youtubeMountRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          mute: call.isMusicMuted ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.seekTo(elapsedSeconds(nowPlaying.startedAtUnixMs), true)
            event.target.playVideo()
          },
        },
      })
      youtubePlayerRef.current = player
    })

    return () => {
      cancelled = true
      player?.destroy()
      youtubePlayerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId, nowPlaying.type])

  useEffect(() => {
    const player = youtubePlayerRef.current
    if (!player) return
    if (call.isMusicMuted) player.mute()
    else player.unMute()
  }, [call.isMusicMuted])

  return (
    <div className="card w-full max-w-md p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Music size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{nowPlaying.title ?? 'Tocando agora'}</p>
            <p className="truncate text-xs text-muted-foreground">compartilhado por {nowPlaying.sharedByDisplayName}</p>
          </div>
        </div>
        {isSharer && (
          <button
            type="button"
            className="icon-btn h-6 w-6 shrink-0"
            onClick={() => void call.stopNowPlaying()}
            title="Parar"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {nowPlaying.type === 'youtube' && youtubeId ? (
        <div className="sr-only" aria-hidden="true">
          <div ref={youtubeMountRef} />
        </div>
      ) : nowPlaying.type === 'audio' ? (
        <audio ref={audioRef} src={nowPlaying.url} controls className="mt-2 w-full" />
      ) : (
        <p className="mt-2 text-xs text-dnd">Link inválido.</p>
      )}
    </div>
  )
}
