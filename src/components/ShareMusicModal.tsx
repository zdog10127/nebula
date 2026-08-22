import { Search } from 'lucide-react'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, apiGet, apiUpload } from '../api/client'
import type { AttachmentSummary, MusicResolveResultDto } from '../api/types'
import { useToast } from '../lib/ToastContext'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Modal from './Modal'

export default function ShareMusicModal({ onClose }: { onClose: () => void }) {
  const call = useVoiceCall()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setIsSharing(true)
    try {
      // Works for either a pasted YouTube link or a typed search term — the backend figures
      // out which one it got and resolves it to a specific video, like a Discord music bot.
      const resolved = await apiGet<MusicResolveResultDto>(`/api/music/resolve?q=${encodeURIComponent(trimmed)}`)
      await call.shareNowPlaying('youtube', `https://www.youtube.com/watch?v=${resolved.videoId}`, resolved.title)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível encontrar essa música.')
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
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
          <label className="label">
            Nome da música ou link
            <input
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: nome do artista - música, ou cole um link do YouTube"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isSharing}>
            <Search size={15} />
            {isSharing ? 'Procurando...' : 'Tocar na sala'}
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
