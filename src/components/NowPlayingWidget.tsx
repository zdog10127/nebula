import { Music, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { NowPlayingDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useVoiceCall } from '../voice/VoiceCallContext'

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1] ?? null
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1] ?? null
    }
    return null
  } catch {
    return null
  }
}

function elapsedSeconds(startedAtUnixMs: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAtUnixMs) / 1000))
}

export default function NowPlayingWidget({ nowPlaying }: { nowPlaying: NowPlayingDto }) {
  const { user } = useAuth()
  const call = useVoiceCall()
  const audioRef = useRef<HTMLAudioElement>(null)
  const isSharer = nowPlaying.sharedByUserId === user?.userId

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
    if (audioRef.current) audioRef.current.muted = call.isMusicMuted
  }, [call.isMusicMuted])

  const youtubeId = nowPlaying.type === 'youtube' ? extractYoutubeId(nowPlaying.url) : null

  return (
    <div className="card w-full max-w-md p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Music size={13} className="shrink-0 text-accent" />
          <span className="truncate">
            {nowPlaying.title ?? 'Tocando agora'} — compartilhado por{' '}
            <span className="text-foreground">{nowPlaying.sharedByDisplayName}</span>
          </span>
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
        <iframe
          key={`${youtubeId}-${call.isMusicMuted}`}
          className="aspect-video w-full rounded-lg"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${call.isMusicMuted ? 1 : 0}&start=${elapsedSeconds(nowPlaying.startedAtUnixMs)}`}
          title="YouTube"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : nowPlaying.type === 'audio' ? (
        <audio ref={audioRef} src={nowPlaying.url} controls className="w-full" />
      ) : (
        <p className="text-xs text-dnd">Link inválido.</p>
      )}
    </div>
  )
}
