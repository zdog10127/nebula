import { MicOff, Music, PhoneCall, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Avatar from './Avatar'
import NowPlayingWidget from './NowPlayingWidget'
import ShareMusicModal from './ShareMusicModal'
import VoiceControls from './VoiceControls'

export default function VoiceChannelView({ channelId, channelName }: { channelId: string; channelName: string }) {
  const { user } = useAuth()
  const call = useVoiceCall()
  const [showShareMusic, setShowShareMusic] = useState(false)
  const isThisChannel = call.channelId === channelId
  const isElsewhere = call.channelId !== null && !isThisChannel

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-panel p-6 text-center">
      {!isThisChannel ? (
        <>
          {isElsewhere && (
            <p className="max-w-sm text-sm text-muted-foreground">
              Você está conectado em <strong className="text-foreground">{call.channelName}</strong>. Entrar aqui vai
              sair de lá.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary px-6 py-3"
            onClick={() => void call.join(channelId, channelName)}
            disabled={call.isConnecting}
          >
            <PhoneCall size={18} />
            {call.isConnecting ? 'Conectando...' : `Entrar em ${channelName}`}
          </button>
        </>
      ) : (
        <>
          <div ref={call.registerScreenShareContainer} className="flex flex-wrap justify-center gap-3" />

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
                      <Avatar url={p.avatarUrl} name={p.name} size={52} />
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
                  <span className="max-w-[80px] truncate text-xs text-muted-foreground">{p.name}</span>
                  {!isSelf && (
                    <button
                      type="button"
                      className={`icon-btn h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isLocallyMuted ? '!opacity-100 text-dnd' : ''
                      }`}
                      onClick={() => call.toggleParticipantMute(p.identity)}
                      title={isLocallyMuted ? `Reativar áudio de ${p.name}` : `Silenciar ${p.name} (só para você)`}
                    >
                      {isLocallyMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
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
        </>
      )}
    </div>
  )
}
