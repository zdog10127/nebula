import { Maximize2, Mic, MicOff, Minimize2, PhoneOff, ScreenShare, ScreenShareOff, Settings, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useVoiceCall } from '../voice/VoiceCallContext'
import VoiceSettingsModal from './VoiceSettingsModal'

export default function VoiceControls({ compact = false }: { compact?: boolean }) {
  const call = useVoiceCall()
  const [showSettings, setShowSettings] = useState(false)
  const sizeClass = compact ? 'h-8 w-8' : 'h-11 w-11'
  const iconSize = compact ? 15 : 19

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'mt-2 gap-2 rounded-2xl bg-raised p-2.5 shadow-pop'}`}>
      <button
        type="button"
        className={`icon-btn ${sizeClass} ${call.isMuted ? 'bg-dnd/15 text-dnd hover:bg-dnd/20' : ''}`}
        onClick={() => void call.toggleMute()}
        title={call.isMuted ? 'Ativar microfone' : 'Silenciar'}
      >
        {call.isMuted ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
      </button>
      <button
        type="button"
        className={`icon-btn ${sizeClass} ${call.isDeafened ? 'bg-dnd/15 text-dnd hover:bg-dnd/20' : ''}`}
        onClick={() => void call.toggleDeafen()}
        title={call.isDeafened ? 'Reativar áudio' : 'Ensurdecer'}
      >
        {call.isDeafened ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}
      </button>
      <button
        type="button"
        className={`icon-btn ${sizeClass} ${call.isNoiseSuppressed ? 'bg-accent-soft text-accent hover:bg-accent-soft' : ''}`}
        onClick={() => void call.toggleNoiseSuppression()}
        title={call.isNoiseSuppressed ? 'Desativar redução de ruído' : 'Ativar redução de ruído'}
      >
        <Sparkles size={iconSize} />
      </button>
      <button
        type="button"
        className={`icon-btn ${sizeClass} ${call.isSharingScreen ? 'bg-accent-soft text-accent hover:bg-accent-soft' : ''}`}
        onClick={() => void call.toggleScreenShare()}
        title={call.isSharingScreen ? 'Parar compartilhamento' : 'Compartilhar tela'}
      >
        {call.isSharingScreen ? <ScreenShareOff size={iconSize} /> : <ScreenShare size={iconSize} />}
      </button>
      {!compact && (
        <button
          type="button"
          className={`icon-btn ${sizeClass}`}
          onClick={() => call.toggleFullscreen()}
          title={call.isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {call.isFullscreen ? <Minimize2 size={iconSize} /> : <Maximize2 size={iconSize} />}
        </button>
      )}
      <button
        type="button"
        className={`icon-btn ${sizeClass}`}
        onClick={() => setShowSettings(true)}
        title="Configurações de voz"
      >
        <Settings size={iconSize} />
      </button>
      <button
        type="button"
        className={`flex ${sizeClass} items-center justify-center rounded-full bg-dnd text-white transition-colors hover:bg-dnd/85`}
        onClick={() => void call.leave()}
        title="Sair da chamada"
      >
        <PhoneOff size={iconSize} />
      </button>
      {showSettings && <VoiceSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
