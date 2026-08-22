import { useEffect } from 'react'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Modal from './Modal'

export default function VoiceSettingsModal({ onClose }: { onClose: () => void }) {
  const call = useVoiceCall()

  useEffect(() => {
    void call.refreshDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal title="Configurações de voz e vídeo" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="label">
          Microfone
          <select
            className="field"
            value={call.audioInputDeviceId ?? ''}
            onChange={(e) => void call.setAudioInputDevice(e.target.value)}
          >
            <option value="">Padrão do sistema</option>
            {call.audioInputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Microfone'}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Saída de áudio
          <select
            className="field"
            value={call.audioOutputDeviceId ?? ''}
            onChange={(e) => void call.setAudioOutputDevice(e.target.value)}
          >
            <option value="">Padrão do sistema</option>
            {call.audioOutputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Saída de áudio'}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-foreground">
          Redução de ruído no microfone
          <input
            type="checkbox"
            checked={call.isNoiseSuppressed}
            onChange={() => void call.toggleNoiseSuppression()}
            className="h-4 w-4 accent-accent"
          />
        </label>

        <label className="label">
          Qualidade ao transmitir a tela
          <select
            className="field"
            value={call.screenShareQuality}
            onChange={(e) => call.setScreenShareQuality(e.target.value as typeof call.screenShareQuality)}
          >
            <option value="auto">Automática</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p (recomendado)</option>
            <option value="1440p">1440p</option>
          </select>
        </label>

        <label className="label">
          Taxa de quadros ao transmitir a tela
          <select
            className="field"
            value={call.screenShareFps}
            onChange={(e) => call.setScreenShareFps(Number(e.target.value) as typeof call.screenShareFps)}
          >
            <option value={60}>60 FPS (padrão)</option>
            <option value={30}>30 FPS</option>
          </select>
        </label>
      </div>
    </Modal>
  )
}
