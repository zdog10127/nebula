import { PinOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiDelete, apiGet } from '../api/client'
import type { MessageDto } from '../api/types'
import Avatar from './Avatar'
import MessageContent from './MessageContent'
import Modal from './Modal'

export default function PinnedMessagesModal({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void apiGet<MessageDto[]>(`/api/channels/${channelId}/messages/pinned`).then((list) => {
      setMessages(list)
      setIsLoading(false)
    })
  }, [channelId])

  async function unpin(id: string) {
    await apiDelete(`/api/messages/${id}/pin`)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <Modal title="Mensagens fixadas" onClose={onClose} size="lg">
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensagem fixada neste canal.</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="flex gap-3 rounded-lg border border-border p-3">
              <Avatar url={m.authorAvatarUrl} name={m.authorDisplayName} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <strong className="text-sm font-semibold text-foreground">{m.authorDisplayName}</strong>
                  <span className="text-xs text-muted-foreground/70">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <MessageContent text={m.content} />
              </div>
              <button type="button" className="icon-btn h-7 w-7 shrink-0" title="Desafixar" onClick={() => void unpin(m.id)}>
                <PinOff size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
