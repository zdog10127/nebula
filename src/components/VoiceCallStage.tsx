import { MicOff, Music, ScreenShare, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Avatar from './Avatar'
import NowPlayingWidget from './NowPlayingWidget'
import ShareMusicModal from './ShareMusicModal'
import VoiceControls from './VoiceControls'

// Shared "inside the call" view: the small embedded card (VoiceChannelView) and the
// app-wide fullscreen overlay (VoiceFullscreenOverlay) both render this, so screen-share
// registration only ever happens from a single mounted place at a time.
export default function VoiceCallStage({ fullscreen = false }: { fullscreen?: boolean }) {
  const { user } = useAuth()
  const call = useVoiceCall()
  const [showShareMusic, setShowShareMusic] = useState(false)
  const avatarSize = fullscreen ? 88 : 52
  const nameWidthClass = fullscreen ? 'max-w-[120px] text-sm' : 'max-w-[80px] text-xs'

  return (
    <div className={`flex w-full flex-col items-center gap-5 ${fullscreen ? 'max-w-4xl' : ''}`}>
      <div ref={call.registerScreenShareContainer} className="flex flex-wrap justify-center gap-3" />

      {call.availableShares.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {call.availableShares.map((s) => {
            const isWatching = call.watchedTrackSids.has(s.trackSid)
            return (
              <div
                key={s.trackSid}
                className="flex items-center gap-2 rounded-lg border border-border-strong bg-raised px-3 py-2 text-xs text-muted-foreground"
              >
                <ScreenShare size={14} className="shrink-0" />
                <span className="max-w-[140px] truncate">{s.name}</span>
                <button
                  type="button"
                  className={`btn ${isWatching ? 'btn-secondary' : 'btn-primary'} !px-2 !py-1 text-[11px]`}
                  onClick={() => call.toggleWatchScreenShare(s.trackSid)}
                >
                  {isWatching ? 'Parar de assistir' : 'Assistir'}
                </button>
                {isWatching && (
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={call.streamVolumes[s.identity] ?? 100}
                    onChange={(e) => call.setStreamVolume(s.identity, Number(e.target.value))}
                    className="h-1 w-16 accent-accent"
                    title={`Volume da transmissão de ${s.name}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {call.nowPlaying && <NowPlayingWidget nowPlaying={call.nowPlaying} />}

      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-4">
        {call.nowPlaying && (
          <li className="group flex flex-col items-center gap-1.5">
            <span className="relative flex">
              <span className="flex rounded-full border-2 border-transparent p-0.5">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Music size={22} />
                </span>
              </span>
            </span>
            <span className="max-w-[80px] truncate text-xs text-muted-foreground">Music</span>
            <button
              type="button"
              className={`icon-btn h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 ${
                call.isMusicMuted ? '!opacity-100 text-dnd' : ''
              }`}
              onClick={() => call.toggleMusicMute()}
              title={call.isMusicMuted ? 'Reativar áudio da música' : 'Silenciar música (só para você)'}
            >
              {call.isMusicMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </li>
        )}
        {call.participants.map((p) => {
          const isSelf = p.identity === user?.userId
          const isLocallyMuted = call.locallyMutedIds.has(p.identity)
          return (
            <li key={p.identity} className="group flex flex-col items-center gap-1.5">
              <span className="relative flex">
                <span
                  className={`flex rounded-full border-2 p-0.5 transition-colors duration-100 ${
                    call.speakingIds.has(p.identity) ? 'border-online' : 'border-transparent'
                  }`}
                >
                  <Avatar url={p.avatarUrl} name={p.name} size={avatarSize} />
                </span>
                {(p.deafened || p.micMuted) && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-dnd text-white ring-2 ring-panel"
                    title={p.deafened ? 'Ensurdecido' : 'Microfone mutado'}
                  >
                    {p.deafened ? <VolumeX size={11} /> : <MicOff size={11} />}
                  </span>
                )}
              </span>
              <span className={`truncate text-muted-foreground ${nameWidthClass}`}>{p.name}</span>
              {!isSelf && (
                <div className="flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={call.participantVolumes[p.identity] ?? 100}
                    onChange={(e) => call.setParticipantVolume(p.identity, Number(e.target.value))}
                    className="h-1 w-16 accent-accent"
                    title={`Volume de ${p.name}`}
                  />
                  <button
                    type="button"
                    className={`icon-btn h-6 w-6 ${isLocallyMuted ? '!opacity-100 text-dnd' : ''}`}
                    onClick={() => call.toggleParticipantMute(p.identity)}
                    title={isLocallyMuted ? `Reativar áudio de ${p.name}` : `Silenciar ${p.name} (só para você)`}
                  >
                    {isLocallyMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-3">
        <VoiceControls />
        {!call.nowPlaying && (
          <button
            type="button"
            className="icon-btn h-11 w-11 rounded-2xl bg-raised shadow-pop"
            onClick={() => setShowShareMusic(true)}
            title="Compartilhar música"
          >
            <Music size={19} />
          </button>
        )}
      </div>

      {showShareMusic && <ShareMusicModal onClose={() => setShowShareMusic(false)} />}
    </div>
  )
}
