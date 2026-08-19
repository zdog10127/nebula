import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, apiUpload } from '../api/client'
import type { AttachmentSummary } from '../api/types'
import { useToast } from '../lib/ToastContext'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Modal from './Modal'

export default function ShareMusicModal({ onClose }: { onClose: () => void }) {
  const call = useVoiceCall()
  const toast = useToast()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  async function handleYoutubeSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSharing(true)
    try {
      await call.shareNowPlaying('youtube', youtubeUrl.trim())
      onClose()
    } finally {
      setIsSharing(false)
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const attachment = await apiUpload<AttachmentSummary>('/api/attachments', file)
      await call.shareNowPlaying('audio', attachment.url, attachment.fileName)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar áudio.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal title="Compartilhar música" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <form onSubmit={handleYoutubeSubmit} className="flex flex-col gap-2">
          <label className="label">
            Link do YouTube
            <input
              className="field"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isSharing}>
            {isSharing ? 'Compartilhando...' : 'Compartilhar vídeo'}
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>

        <label className="btn btn-secondary cursor-pointer justify-center">
          {isUploading ? 'Enviando...' : 'Enviar arquivo de áudio (MP3)'}
          <input type="file" accept="audio/*" onChange={(e) => void handleFileChange(e)} disabled={isUploading} hidden />
        </label>
      </div>
    </Modal>
  )
}
