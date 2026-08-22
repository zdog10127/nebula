import { PhoneCall } from 'lucide-react'
import { useVoiceCall } from '../voice/VoiceCallContext'
import VoiceCallStage from './VoiceCallStage'

export default function VoiceChannelView({ channelId, channelName }: { channelId: string; channelName: string }) {
  const call = useVoiceCall()
  const isThisChannel = call.channelId === channelId
  const isElsewhere = call.channelId !== null && !isThisChannel

  if (!isThisChannel) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-panel p-6 text-center">
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
      </div>
    )
  }

  if (call.isFullscreen) {
    // The real UI lives in VoiceFullscreenOverlay (mounted app-wide) while fullscreen is on,
    // so this route just shows a lightweight placeholder instead of duplicating the stage.
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-panel p-6 text-center text-sm text-muted-foreground">
        <p>Você está em tela cheia nesta chamada.</p>
        <button type="button" className="btn btn-secondary" onClick={() => call.toggleFullscreen()}>
          Sair da tela cheia
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-panel p-6 text-center">
      <VoiceCallStage />
    </div>
  )
}
